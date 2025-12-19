import { NextRequest, NextResponse } from 'next/server';
import { storeTaskData, storeTaskLocation } from '@/lib/redis';

/**
 * Create a new order (user places order)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      taskId,
      item,
      pickup,
      destination,
      customer,
    } = body;

    // Validate required fields
    if (!taskId || !item || !pickup || !destination || !customer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store order data in Redis as pending
    const orderData = {
      taskId,
      item,
      pickup,
      destination,
      customer,
      status: 'PENDING', // Waiting for delivery agent
      createdAt: new Date().toISOString(),
      driver: null, // No driver assigned yet
    };

    await storeTaskData(taskId, orderData);

    // Initialize location at pickup (so tracking page works immediately)
    const initialLocation = {
      taskId,
      driverId: 'pending',
      lat: pickup.lat,
      lng: pickup.lng,
      speed: 0,
      timestamp: Date.now(),
      status: 'PENDING',
      eta: 'Waiting for delivery partner...',
      distance: 0,
      duration: 0,
      driver: null,
    };

    await storeTaskLocation(taskId, initialLocation);

    // Also store in pending orders list
    const redis = (await import('@/lib/redis')).redis;
    await redis.lpush('pending_orders', JSON.stringify(orderData));
    await redis.expire('pending_orders', 3600); // 1 hour TTL

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: {
        taskId,
        trackingUrl: `/track/${taskId}`,
      },
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
