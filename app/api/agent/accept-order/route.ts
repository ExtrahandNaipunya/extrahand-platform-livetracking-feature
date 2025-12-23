import { NextRequest, NextResponse } from 'next/server';
import { getTaskData, storeTaskData, storeTaskLocation, redis } from '@/lib/redis';

/**
 * Accept an order (delivery agent accepts)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      taskId,
      agentId,
      agentName,
      agentPhone,
    } = body;

    // Validate required fields
    if (!taskId || !agentId || !agentName || !agentPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get task data
    const taskData = await getTaskData(taskId);
    
    if (!taskData) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Update task with driver info
    const updatedTask = {
      ...taskData,
      driver: {
        id: agentId,
        name: agentName,
        phone: agentPhone,
        vehicleNumber: 'TS09 XX 0000',
        rating: 4.5,
      },
      status: 'PICKED_UP',
      acceptedAt: new Date().toISOString(),
    };

    await storeTaskData(taskId, updatedTask);

    // Initialize location at pickup
    const initialLocation = {
      taskId,
      driverId: agentId,
      lat: taskData.pickup.lat,
      lng: taskData.pickup.lng,
      speed: 0,
      timestamp: Date.now(),
      status: 'PICKED_UP',
      eta: 'Calculating...',
      distance: 0,
      duration: 0,
      driver: updatedTask.driver,
    };

    await storeTaskLocation(taskId, initialLocation);

    // Remove from pending orders
    const pendingOrders = await redis.lrange('pending_orders', 0, -1);
    const filtered = pendingOrders.filter((order: any) => {
      const orderObj = typeof order === 'string' ? JSON.parse(order) : order;
      return orderObj.taskId !== taskId;
    });
    
    await redis.del('pending_orders');
    if (filtered.length > 0) {
      await redis.lpush('pending_orders', ...filtered);
    }

    // Broadcast to customer tracking page via WebSocket
    const { publishLocationUpdate } = await import('@/lib/redis');
    await publishLocationUpdate(taskId, {
      ...initialLocation,
      notification: {
        type: 'agent_accepted',
        message: `${agentName} accepted your order!`,
        driverInfo: updatedTask.driver,
        deliveryOTP: taskData.deliveryOTP,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Order accepted successfully',
      data: {
        taskId,
        navigationUrl: `/agent/navigate/${taskId}`,
      },
    });

  } catch (error) {
    console.error('Error accepting order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
