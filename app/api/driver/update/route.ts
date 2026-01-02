import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { calculateETA, haversineDistance } from '@/lib/eta';
import { publishLocationUpdate } from '@/lib/redis';
import { connectToDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, driverId, lat, lng, speed, timestamp } = body;

    // Validate required fields
    if (!taskId || !driverId || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, driverId, lat, lng' },
        { status: 400 }
      );
    }

    console.log('📍 DRIVER UPDATE:', { taskId, driverId, lat, lng, speed });

    // Get task data from Redis
    const taskData = await redis.get(`task:${taskId}:data`);
    if (!taskData) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = typeof taskData === 'string' ? JSON.parse(taskData) : taskData;

    // Determine current status based on location
    const currentLocation = { lat, lng };
    let status = task.status || 'ON_THE_WAY';

    // Check if near pickup (within 100m) - set to PICKED_UP or ON_THE_WAY
    const distanceToPickup = haversineDistance(currentLocation, task.pickup);
    
    // Check if near destination (within 100m)
    const distanceToDestination = haversineDistance(currentLocation, task.destination);

    // Status logic
    if (status === 'PENDING' && distanceToPickup < 0.1) {
      status = 'PICKED_UP';
    } else if (status === 'PICKED_UP' && distanceToPickup > 0.1) {
      status = 'ON_THE_WAY';
    } else if (distanceToDestination < 0.2) {
      status = 'ARRIVING';
    }

    // Calculate ETA and distance to destination
    const etaResult = await calculateETA(currentLocation, task.destination);
    const eta = etaResult.eta;
    const distance = etaResult.distance;
    const duration = etaResult.duration;

    // Prepare location data for Redis and broadcast
    const locationData = {
      taskId,
      driverId,
      lat,
      lng,
      speed: speed || 0,
      timestamp: timestamp || Date.now(),
      status,
      eta,
      distance,
      duration,
      remainingDistance: distance, // ✅ FIXED: Include remainingDistance in WebSocket broadcast
      driver: task.driver,
    };

    // Save to Redis (ephemeral - for real-time tracking)
    await redis.set(`task:${taskId}:location`, locationData, { ex: 86400 }); // 24 hour TTL

    // Update task status in Redis
    const updatedTaskData = {
      ...task,
      status,
    };
    await redis.set(`task:${taskId}:data`, updatedTaskData, { ex: 86400 });

    // Broadcast to WebSocket subscribers
    await publishLocationUpdate(taskId, locationData);

    console.log('✅ BROADCAST: Location update sent to WebSocket subscribers', {
      taskId,
      status,
      eta,
      distance: distance.toFixed(2) + ' km',
      remainingDistance: distance.toFixed(2) + ' km',
      speed: (speed || 0) + ' km/h',
    });

    // Save to MongoDB for history (non-blocking)
    try {
      const { db } = await connectToDatabase();
      await db.collection('location_history').insertOne({
        taskId,
        driverId,
        lat,
        lng,
        speed: speed || 0,
        timestamp: timestamp || Date.now(),
        status,
        createdAt: new Date(),
      });
    } catch (dbError) {
      console.error('MongoDB save failed (non-critical):', dbError);
      // Don't fail the request if MongoDB fails
    }

    // Return success with updated data
    return NextResponse.json({
      success: true,
      data: {
        status,
        eta,
        distance,
        duration,
        remainingDistance: distance,
      },
    });

  } catch (error: any) {
    console.error('Error updating driver location:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update location' },
      { status: 500 }
    );
  }
}
