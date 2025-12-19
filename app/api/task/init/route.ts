import { NextRequest, NextResponse } from 'next/server';
import { storeTaskData } from '@/lib/redis';

/**
 * Initialize a new task with pickup, destination, and driver info
 * This endpoint is used to create demo tasks or initialize real tasks from your main system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      taskId,
      pickup,
      destination,
      driver,
    } = body;

    // Validate required fields
    if (!taskId || !pickup || !destination || !driver) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, pickup, destination, driver' },
        { status: 400 }
      );
    }

    // Validate location format
    if (!pickup.lat || !pickup.lng || !destination.lat || !destination.lng) {
      return NextResponse.json(
        { error: 'Invalid location format. Required: { lat: number, lng: number }' },
        { status: 400 }
      );
    }

    // Validate driver info
    if (!driver.id || !driver.name || !driver.phone) {
      return NextResponse.json(
        { error: 'Invalid driver info. Required: { id, name, phone }' },
        { status: 400 }
      );
    }

    // Store task data in Redis
    const taskData = {
      taskId,
      pickup,
      destination,
      driver,
      status: 'PICKED_UP',
      createdAt: new Date().toISOString(),
    };

    await storeTaskData(taskId, taskData);

    return NextResponse.json({
      success: true,
      message: 'Task initialized successfully',
      data: {
        taskId,
        trackingUrl: `/track/${taskId}`,
      },
    });

  } catch (error) {
    console.error('Error initializing task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get example payload for task initialization
 */
export async function GET() {
  const examplePayload = {
    taskId: 'task_' + Date.now(),
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
  };

  return NextResponse.json({
    message: 'Use POST request with the following payload to initialize a task',
    example: examplePayload,
  });
}
