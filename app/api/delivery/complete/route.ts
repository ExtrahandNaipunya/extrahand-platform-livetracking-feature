import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getDatabase } from '@/lib/database';

/**
 * Complete delivery and mark task as COMPLETED
 * Called by agent after delivery is made
 */
export async function POST(request: NextRequest) {
  try {
    const { taskId, proofOfDelivery } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get task data from Redis
    const taskDataKey = `task:${taskId}:data`;
    const taskData = await redis.get(taskDataKey);

    if (!taskData) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = typeof taskData === 'string' ? JSON.parse(taskData) : taskData;

    // Update task as COMPLETED
    const completedTask = {
      ...task,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      proofOfDelivery: proofOfDelivery || {
        deliveredAt: new Date().toISOString(),
        recipientName: task.customer?.name || 'Customer',
        notes: 'Delivered successfully',
      },
    };

    // Save updated task to Redis
    await redis.set(taskDataKey, JSON.stringify(completedTask), { ex: 86400 }); // 24 hour expiry

    // Update location status
    const locationKey = `task:${taskId}:location`;
    const locationData = await redis.get(locationKey);
    
    if (locationData) {
      const location = typeof locationData === 'string' ? JSON.parse(locationData) : locationData;
      const completedLocation = {
        ...location,
        status: 'COMPLETED',
        eta: 'Delivered',
        distance: 0,
        timestamp: new Date().toISOString(),
      };
      await redis.set(locationKey, JSON.stringify(completedLocation), { ex: 86400 });
    }

    // Broadcast completion via WebSocket
    if (global.io) {
      const channel = `task:${taskId}`;
      global.io.to(channel).emit('delivery_completed', {
        taskId,
        status: 'COMPLETED',
        completedAt: completedTask.completedAt,
        proofOfDelivery: completedTask.proofOfDelivery,
      });
    }

    // Save to MongoDB for persistent history
    try {
      const db = await getDatabase();
      await db.collection('deliveries').updateOne(
        { taskId },
        {
          $set: {
            status: 'COMPLETED',
            completedAt: completedTask.completedAt,
            proofOfDelivery: completedTask.proofOfDelivery,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: false }
      );
    } catch (dbError) {
      console.error('Failed to save to MongoDB (non-critical):', dbError);
      // Don't fail the request if MongoDB update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery completed successfully',
      taskId,
      completedAt: completedTask.completedAt,
    });

  } catch (error: any) {
    console.error('Error completing delivery:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete delivery' },
      { status: 500 }
    );
  }
}
