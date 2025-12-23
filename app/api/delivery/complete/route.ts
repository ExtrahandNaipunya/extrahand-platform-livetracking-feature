import { NextRequest, NextResponse } from 'next/server';
import { getTaskData, storeTaskData, storeTaskLocation } from '@/lib/redis';
import { ProofOfDelivery } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      taskId,
      otp,
      proofOfDelivery,
    }: {
      taskId: string;
      otp: string;
      proofOfDelivery: ProofOfDelivery;
    } = body;

    // Validate required fields
    if (!taskId || !otp) {
      return NextResponse.json(
        { error: 'Missing taskId or OTP' },
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

    // Verify OTP
    if (taskData.deliveryOTP !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 401 }
      );
    }

    // Update task status to COMPLETED
    const completedTaskData = {
      ...taskData,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      proofOfDelivery: {
        ...proofOfDelivery,
        otpVerified: true,
        deliveredAt: new Date().toISOString(),
      },
    };

    await storeTaskData(taskId, completedTaskData);

    // Update location status to COMPLETED
    const completedLocation = {
      taskId,
      driverId: taskData.driver?.id || 'unknown',
      lat: taskData.destination.lat,
      lng: taskData.destination.lng,
      speed: 0,
      timestamp: Date.now(),
      status: 'COMPLETED',
      eta: 'Delivered',
      distance: 0,
      duration: 0,
      driver: taskData.driver,
    };

    await storeTaskLocation(taskId, completedLocation);

    // Publish completion update to WebSocket
    const { publishLocationUpdate } = await import('@/lib/redis');
    await publishLocationUpdate(taskId, {
      ...completedLocation,
      status: 'COMPLETED',
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery completed successfully',
      data: {
        taskId,
        status: 'COMPLETED',
        completedAt: completedTaskData.completedAt,
      },
    });

  } catch (error) {
    console.error('Error completing delivery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
