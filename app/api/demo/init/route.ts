import { NextRequest, NextResponse } from 'next/server';
import { storeTaskData, storeTaskLocation } from '@/lib/redis';

/**
 * Initialize demo task automatically
 * This endpoint creates a demo task if it doesn't exist
 */
export async function GET(request: NextRequest) {
  try {
    const demoTaskId = 'demo-task-123';

    // Demo task data
    const taskData = {
      taskId: demoTaskId,
      pickup: {
        lat: 17.385044,
        lng: 78.486671,
        address: 'Hitech City, Hyderabad',
      },
      destination: {
        lat: 17.440826,
        lng: 78.348449,
        address: 'Gachibowli, Hyderabad',
      },
      driver: {
        id: 'driver_001',
        name: 'Rajesh Kumar',
        phone: '+91-9876543210',
        vehicleNumber: 'TS09 AB 1234',
        rating: 4.8,
      },
      status: 'PICKED_UP',
      createdAt: new Date().toISOString(),
    };

    // Store task data
    await storeTaskData(demoTaskId, taskData);

    // Store initial location (at pickup point)
    const initialLocation = {
      taskId: demoTaskId,
      driverId: 'driver_001',
      lat: 17.385044,
      lng: 78.486671,
      speed: 0,
      timestamp: Date.now(),
      status: 'PICKED_UP',
      eta: 'Calculating...',
      distance: 0,
      duration: 0,
      driver: taskData.driver,
    };

    await storeTaskLocation(demoTaskId, initialLocation);

    return NextResponse.json({
      success: true,
      message: 'Demo task initialized',
      data: {
        taskId: demoTaskId,
        trackingUrl: `/track/${demoTaskId}`,
      },
    });
  } catch (error) {
    console.error('Error initializing demo task:', error);
    return NextResponse.json(
      { error: 'Failed to initialize demo task' },
      { status: 500 }
    );
  }
}
