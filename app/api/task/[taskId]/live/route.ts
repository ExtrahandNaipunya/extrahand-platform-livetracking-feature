import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ taskId: string }> }
) {
  try {
    const params = await props.params;
    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get task data from Redis
    const taskData = await redis.get(`task:${taskId}:data`);
    if (!taskData) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = typeof taskData === 'string' ? JSON.parse(taskData) : taskData;

    // Get current location from Redis
    const locationData = await redis.get(`task:${taskId}:location`);
    
    let currentLat = task.pickup.lat;
    let currentLng = task.pickup.lng;
    let status = task.status || 'PENDING';
    let eta = 'Calculating...';
    let distance = 0;
    let duration = 0;
    let speed = 0;

    if (locationData) {
      const location = typeof locationData === 'string' ? JSON.parse(locationData) : locationData;
      currentLat = location.lat;
      currentLng = location.lng;
      status = location.status || status;
      eta = location.eta || eta;
      distance = location.distance || distance;
      duration = location.duration || duration;
      speed = location.speed || speed;
    }

    // Build response
    const response = {
      lat: currentLat,
      lng: currentLng,
      eta,
      status,
      driver: task.driver,
      pickup: task.pickup,
      destination: task.destination,
      distance,
      remainingDistance: distance,
      duration,
      speed,
      deliveryOTP: task.deliveryOTP,
      proofOfDelivery: task.proofOfDelivery,
      customer: task.customer,
      item: task.item,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching live tracking data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tracking data' },
      { status: 500 }
    );
  }
}
