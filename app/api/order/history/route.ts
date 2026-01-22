import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { redis } from '@/lib/redis';

/**
 * Get order history for a user
 * Fetches from MongoDB (completed orders) and Redis (active orders)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = request.headers.get('x-user-id') || 'demo-user'; // For now, using demo-user
    const status = searchParams.get('status'); // 'all' | 'completed' | 'cancelled' | 'active'

    const orders = [];

    // 1. Fetch completed/cancelled orders from MongoDB
    try {
      const db = await getDatabase();
      const deliveriesCollection = db.collection('deliveries');
      
      // Build query
      const query: any = {};
      if (status && status !== 'all' && status !== 'active') {
        query.status = status.toUpperCase();
      }

      const mongoOrders = await deliveriesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      // Transform MongoDB documents to OrderHistory format
      for (const order of mongoOrders) {
        orders.push({
          taskId: order.taskId,
          pickup: order.pickup || { lat: 0, lng: 0, address: 'N/A' },
          destination: order.destination || { lat: 0, lng: 0, address: 'N/A' },
          status: order.status || 'COMPLETED',
          createdAt: order.createdAt || order.updatedAt || new Date().toISOString(),
          completedAt: order.completedAt,
          driver: order.driver || null,
          item: order.item || 'Package',
          customer: order.customer || { name: 'Customer', phone: '' },
          totalDistance: order.totalDistance,
          totalDuration: order.totalDuration,
          proofOfDelivery: order.proofOfDelivery,
          rating: order.rating,
          review: order.review,
        });
      }
    } catch (dbError) {
      console.error('Error fetching from MongoDB:', dbError);
      // Continue even if MongoDB fails
    }

    // 2. Fetch active orders from Redis (if status is 'all' or 'active')
    if (!status || status === 'all' || status === 'active') {
      try {
        // Get all pending orders
        const pendingOrdersData = await redis.lrange('pending_orders', 0, -1);
        
        for (const orderStr of pendingOrdersData) {
          try {
            const order = typeof orderStr === 'string' ? JSON.parse(orderStr) : orderStr;
            
            // Skip if already in MongoDB results
            if (orders.find((o) => o.taskId === order.taskId)) continue;

            // Get task data from Redis
            const taskDataKey = `task:${order.taskId}:data`;
            const taskData = await redis.get(taskDataKey);
            
            if (taskData) {
              const task = typeof taskData === 'string' ? JSON.parse(taskData) : taskData;
              
              // Only include if status matches
              if (status === 'active' || !status || status === 'all') {
                orders.push({
                  taskId: task.taskId || order.taskId,
                  pickup: task.pickup || order.pickup || { lat: 0, lng: 0, address: 'N/A' },
                  destination: task.destination || order.destination || { lat: 0, lng: 0, address: 'N/A' },
                  status: task.status || order.status || 'PENDING',
                  createdAt: task.createdAt || order.createdAt || new Date().toISOString(),
                  driver: task.driver || order.driver || null,
                  item: task.item || order.item || 'Package',
                  customer: task.customer || order.customer || { name: 'Customer', phone: '' },
                });
              }
            }
          } catch (parseError) {
            console.error('Error parsing order from Redis:', parseError);
          }
        }

        // Also check for active orders in Redis (not in pending list)
        // This handles orders that have been accepted but not completed
        const keys = await redis.keys('task:*:data');
        for (const key of keys.slice(0, 50)) { // Limit to avoid performance issues
          try {
            const taskData = await redis.get(key);
            if (taskData) {
              const task = typeof taskData === 'string' ? JSON.parse(taskData) : taskData;
              
              // Skip if already added or if completed
              if (orders.find((o) => o.taskId === task.taskId) || task.status === 'COMPLETED') {
                continue;
              }

              // Only include active orders
              if (task.status && task.status !== 'COMPLETED' && task.status !== 'CANCELLED') {
                if (status === 'active' || !status || status === 'all') {
                  orders.push({
                    taskId: task.taskId,
                    pickup: task.pickup || { lat: 0, lng: 0, address: 'N/A' },
                    destination: task.destination || { lat: 0, lng: 0, address: 'N/A' },
                    status: task.status || 'PENDING',
                    createdAt: task.createdAt || new Date().toISOString(),
                    driver: task.driver || null,
                    item: task.item || 'Package',
                    customer: task.customer || { name: 'Customer', phone: '' },
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error processing Redis key:', error);
          }
        }
      } catch (redisError) {
        console.error('Error fetching from Redis:', redisError);
        // Continue even if Redis fails
      }
    }

    // Sort by creation date (newest first)
    orders.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    });

  } catch (error: any) {
    console.error('Error fetching order history:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch order history' },
      { status: 500 }
    );
  }
}
