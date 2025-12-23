import { NextRequest, NextResponse } from 'next/server';
import { getTaskLocation, getTaskData } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get current location from Redis
    const locationData = await getTaskLocation(taskId);
    
    if (!locationData) {
      return NextResponse.json(
        { error: 'No live tracking data available' },
        { status: 404 }
      );
    }

    // Get task details
    const taskData = await getTaskData(taskId);

    if (!taskData) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const response = {
      lat: locationData.lat,
      lng: locationData.lng,
      eta: locationData.eta,
      status: locationData.status,
      driver: taskData.driver,
      pickup: taskData.pickup,
      destination: taskData.destination,
      distance: locationData.distance,
      duration: locationData.duration,
      timestamp: locationData.timestamp,
      deliveryOTP: taskData.deliveryOTP, // Include OTP for driver verification
      proofOfDelivery: taskData.proofOfDelivery, // Include POD if completed
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching task location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
