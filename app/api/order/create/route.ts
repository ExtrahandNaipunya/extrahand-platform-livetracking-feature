import { NextRequest, NextResponse } from 'next/server';
import { storeTaskData, storeTaskLocation } from '@/lib/redis';
import { getDatabase } from '@/lib/database';

/**
 * Generate 4-digit OTP
 */
function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

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

    // Generate OTP for delivery verification
    const deliveryOTP = generateOTP();

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
      deliveryOTP, // Store OTP
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

    // Save to MongoDB for persistent history (non-blocking)
    try {
      const db = await getDatabase();
      await db.collection('deliveries').insertOne({
        ...orderData,
        updatedAt: new Date().toISOString(),
      });
    } catch (dbError) {
      console.error('Failed to save order to MongoDB (non-critical):', dbError);
      // Don't fail the request if MongoDB insert fails
    }

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: {
        taskId,
        trackingUrl: `/track/${taskId}`,
        deliveryOTP, // Send OTP to customer (via SMS/email in production)
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
