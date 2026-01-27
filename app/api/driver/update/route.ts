import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { calculateETA, haversineDistance, formatDuration } from '@/lib/eta';
import { publishLocationUpdate } from '@/lib/redis';
import { connectToDatabase } from '@/lib/database';

// Configuration for Stream Processing
const UPDATE_THROTTLE_MS = 3000; // 3 seconds sliding window
const MICRO_MOVEMENT_THRESHOLD_KM = 0.01; // 10 meters

interface LastProcessedState {
  timestamp: number;
  serverTimestamp: number;
  lat: number;
  lng: number;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, driverId, lat, lng, speed, timestamp } = body;

    // 1. Validation
    if (!taskId || !driverId || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, driverId, lat, lng' },
        { status: 400 }
      );
    }

    const currentTimestamp = timestamp || Date.now();
    const serverNow = Date.now();

    // 2. Stream Processing - Fetch Previous State
    const lastProcessedKey = `task:${taskId}:last_processed`;
    const lastProcessedData = await redis.get(lastProcessedKey);
    const lastState: LastProcessedState | null = typeof lastProcessedData === 'string'
      ? JSON.parse(lastProcessedData)
      : lastProcessedData;

    // 3. Current Location & Task Data
    const currentLocation = { lat, lng };

    // Get task metadata for status calculation
    const taskData = await redis.get(`task:${taskId}:data`);
    if (!taskData) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = typeof taskData === 'string' ? JSON.parse(taskData) : taskData;

    // 4. Status Determination Logic
    // Allow explicit status update from client (e.g. at pickup verification)
    let status = body.status || task.status || 'ON_THE_WAY';
    const distanceToPickup = haversineDistance(currentLocation, task.pickup);
    const distanceToDestination = haversineDistance(currentLocation, task.destination);

    // Auto-update status based on location if not explicitly sent
    if (!body.status) {
      if ((status === 'PENDING' || status === 'ASSIGNED') && distanceToPickup < 0.05) {
        status = 'PICKED_UP';
      } else if (status === 'PICKED_UP' && distanceToPickup > 0.1) {
        status = 'ON_THE_WAY';
      } else if (distanceToDestination < 0.05) {
        status = 'ARRIVING';
      }
    } else if (distanceToDestination < 0.05) {
      status = 'ARRIVING';
    }

    // 5. Intelligent Filtering (Stream Processing Logic)
    let shouldProcess = true;
    let skipReason = '';

    if (lastState) {
      // Filter A: Event Deduplication (Out-of-order handling)
      if (currentTimestamp <= lastState.timestamp) {
        shouldProcess = false;
        skipReason = 'Duplicate or out-of-order event';
      }

      // If status CHANGED, always process (Critical Event)
      else if (status !== lastState.status) {
        shouldProcess = true;
        console.log(`⚡ CRITICAL UPDATE: Status changed ${lastState.status} -> ${status}`);
      }

      // Filter B: Throttling (Sliding Window)
      else if (serverNow - lastState.serverTimestamp < UPDATE_THROTTLE_MS) {
        shouldProcess = false;
        skipReason = `Throttled (Wait ${UPDATE_THROTTLE_MS}ms)`;
      }

      // Filter C: Micro-movement Filtering
      else {
        const movedDistance = haversineDistance(
          { lat: lastState.lat, lng: lastState.lng },
          currentLocation
        );
        if (movedDistance < MICRO_MOVEMENT_THRESHOLD_KM) {
          shouldProcess = false;
          skipReason = `Micro-movement ignored (<${MICRO_MOVEMENT_THRESHOLD_KM * 1000}m)`;
        }
      }
    }

    // Diagnostic Log
    if (!shouldProcess) {
      // console.log(`⏭️ SKIPPED: ${skipReason} for task ${taskId}`);
      return NextResponse.json({
        success: true,
        message: 'Update skipped by stream processor',
        reason: skipReason
      });
    }

    // 6. Processing (Heavy Calculation)
    let eta: string;
    let distance: number;
    let duration: number;

    // If driver is ASSIGNED (en route to pickup), calculate total trip: (Driver -> Pickup) + (Pickup -> Destination)
    if (status === 'ASSIGNED' || status === 'PENDING') {
      // Leg 1: Driver -> Pickup
      const leg1 = await calculateETA(currentLocation, task.pickup);

      // Leg 2: Pickup -> Destination
      const leg2 = await calculateETA(task.pickup, task.destination);

      distance = leg1.distance + leg2.distance;
      duration = leg1.duration + leg2.duration;
      eta = formatDuration(duration);

      console.log('📍 Multi-leg ETA:', { leg1: leg1.distance, leg2: leg2.distance, total: distance });
    } else {
      // Driver has picked up (or is arriving): Calculate direct remaining route (Driver -> Destination)
      const etaResult = await calculateETA(currentLocation, task.destination);
      eta = etaResult.eta;
      distance = etaResult.distance;
      duration = etaResult.duration;
    }

    // Prepare payload
    const locationData = {
      taskId,
      driverId,
      lat,
      lng,
      speed: speed || 0,
      timestamp: currentTimestamp,
      status,
      eta,
      distance,
      duration,
      remainingDistance: distance,
      driver: task.driver,
    };

    // 7. Update State & Cache (Redis)
    const newLastState: LastProcessedState = {
      timestamp: currentTimestamp,
      serverTimestamp: serverNow,
      lat,
      lng,
      status
    };

    // Transaction-like update sequence
    await Promise.all([
      // Store volatile location data
      redis.set(`task:${taskId}:location`, locationData, { ex: 86400 }),
      // Store processing state
      redis.set(lastProcessedKey, newLastState, { ex: 86400 }),
      // Update task status if changed
      redis.set(`task:${taskId}:data`, { ...task, status }, { ex: 86400 }),
      // Broadcast to WebSocket
      publishLocationUpdate(taskId, locationData)
    ]);

    console.log('✅ BROADCAST: Stream Processed Update', {
      taskId,
      status,
      eta,
      distance: distance.toFixed(2) + ' km',
      reason: lastState ? 'Routine Update' : 'First Update'
    });

    // 8. Persist History (Async / Fire-and-forget)
    connectToDatabase().then(({ db }) => {
      db.collection('location_history').insertOne({
        taskId,
        driverId,
        lat,
        lng,
        speed: speed || 0,
        timestamp: currentTimestamp,
        status,
        createdAt: new Date(),
      }).catch(err => console.error('MongoDB save failed:', err));
    });

    return NextResponse.json({
      success: true,
      data: { status, eta, distance, duration, remainingDistance: distance }
    });

  } catch (error: any) {
    console.error('Error in driver update stream:', error);
    return NextResponse.json(
      { error: error.message || 'Stream processing failed' },
      { status: 500 }
    );
  }
}
