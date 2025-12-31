import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

/**
 * Agent accepts an order
 * - Removes order from pending list
 * - Assigns agent to the task
 * - Updates task status to ASSIGNED
 */
export async function POST(request: NextRequest) {
  try {
    const { taskId, agentId } = await request.json();

    if (!taskId || !agentId) {
      return NextResponse.json(
        { error: 'Missing taskId or agentId' },
        { status: 400 }
      );
    }

    // Get task data from Redis
    const taskDataKey = `task:${taskId}:data`;
    const taskData = await redis.get(taskDataKey);

    if (!taskData) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = typeof taskData === 'string' ? JSON.parse(taskData) : taskData;

    // Check if task is already assigned
    if (task.status !== 'PENDING' && task.agentId) {
      return NextResponse.json(
        { error: 'Task already assigned to another agent' },
        { status: 409 }
      );
    }

    // Update task with agent information
    const updatedTask = {
      ...task,
      agentId,
      status: 'ASSIGNED',
      assignedAt: new Date().toISOString(),
      driver: {
        id: agentId,
        name: `Agent ${agentId.slice(-6)}`,
        phone: '+1234567890',
        vehicle: 'Motorcycle',
        rating: 4.8,
      },
    };

    // Save updated task back to Redis
    await redis.set(taskDataKey, JSON.stringify(updatedTask), { ex: 86400 }); // 24 hour expiry

    // Remove from pending orders list
    const pendingOrders = await redis.lrange('pending_orders', 0, -1);
    
    // Filter out the accepted order
    const remainingOrders = pendingOrders.filter((order: any) => {
      try {
        const orderObj = typeof order === 'string' ? JSON.parse(order) : order;
        return orderObj.taskId !== taskId;
      } catch {
        return true;
      }
    });

    // Clear and rebuild pending orders list
    await redis.del('pending_orders');
    if (remainingOrders.length > 0) {
      await redis.rpush('pending_orders', ...remainingOrders);
    }

    // Add to active orders list for this agent
    const activeOrderKey = `agent:${agentId}:active_order`;
    await redis.set(activeOrderKey, JSON.stringify(updatedTask), { ex: 86400 });

    // Initialize location for the task
    const initialLocation = {
      taskId,
      lat: task.pickup.lat,
      lng: task.pickup.lng,
      status: 'ASSIGNED',
      eta: 'Calculating...',
      distance: 0,
      speed: 0,
      timestamp: new Date().toISOString(),
    };

    await redis.set(`task:${taskId}:location`, JSON.stringify(initialLocation), { ex: 86400 });

    return NextResponse.json({
      success: true,
      message: 'Order accepted successfully',
      task: updatedTask,
    });

  } catch (error) {
    console.error('Error accepting order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
