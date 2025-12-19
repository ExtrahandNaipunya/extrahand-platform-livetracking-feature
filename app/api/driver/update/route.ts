import { NextRequest, NextResponse } from 'next/server';
import { driverUpdateSchema } from '@/lib/validation';
import { storeTaskLocation, publishLocationUpdate, getTaskData } from '@/lib/redis';
import { calculateETA, haversineDistance, determineTaskStatus } from '@/lib/eta';
import { storeLocationHistory } from '@/lib/database';
import { TaskStatus } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = driverUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { taskId, driverId, lat, lng, speed, timestamp } = validationResult.data;

    // Get task data (pickup, destination)
    const taskData = await getTaskData(taskId);
    
    if (!taskData) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const { destination, driver } = taskData;

    // Calculate ETA
    const etaResult = await calculateETA(
      { lat, lng },
      destination,
      speed > 0 ? speed : undefined
    );

    // Determine status based on distance
    const distanceToDestination = haversineDistance({ lat, lng }, destination);
    let status: TaskStatus = 'ON_THE_WAY';

    if (distanceToDestination < 0.5) {
      status = 'ARRIVING';
    }

    // Prepare location update
    const locationUpdate = {
      taskId,
      driverId,
      lat,
      lng,
      speed,
      timestamp,
      status,
      eta: etaResult.eta,
      distance: etaResult.distance,
      duration: etaResult.duration,
      driver,
    };

    // Store in Redis (live state)
    await storeTaskLocation(taskId, locationUpdate);

    // Publish to WebSocket subscribers
    await publishLocationUpdate(taskId, locationUpdate);

    // Store in MongoDB for history (non-blocking)
    storeLocationHistory({
      taskId,
      driverId,
      lat,
      lng,
      speed,
      timestamp,
      status,
    }).catch(err => console.error('Failed to store history:', err));

    return NextResponse.json({
      success: true,
      data: {
        status,
        eta: etaResult.eta,
        distance: etaResult.distance,
      },
    });

  } catch (error) {
    console.error('Error processing driver update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
