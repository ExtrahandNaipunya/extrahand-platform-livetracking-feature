import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

/**
 * Get all pending orders (for delivery agents)
 */
export async function GET(request: NextRequest) {
  try {
    // Get pending orders from Redis list
    const pendingOrdersData = await redis.lrange('pending_orders', 0, -1);
    
    const orders = pendingOrdersData
      .map((order: any) => {
        try {
          return typeof order === 'string' ? JSON.parse(order) : order;
        } catch {
          return null;
        }
      })
      .filter((order: any) => order !== null);

    return NextResponse.json({
      success: true,
      orders,
    });

  } catch (error) {
    console.error('Error fetching pending orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
