'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OrderHistory } from '@/types';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    fetchOrderHistory();
  }, [filter]);

  const fetchOrderHistory = async () => {
    try {
      setLoading(true);
      
      // Determine status filter for API
      let statusParam = 'all';
      if (filter === 'completed') statusParam = 'completed';
      else if (filter === 'cancelled') statusParam = 'cancelled';
      else if (filter === 'all') statusParam = 'all';

      const response = await fetch(`/api/order/history?status=${statusParam}`, {
        headers: {
          'x-user-id': 'demo-user', // In production, get from auth context
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order history');
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        console.error('Error fetching orders:', data.error);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching order history:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return order.status === 'COMPLETED';
    if (filter === 'cancelled') return order.status === 'CANCELLED';
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return <SkeletonLoader variant="history" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50 border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-black transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="text-yellow-400 mr-2">📜</span>
                Order History
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400 text-3xl">⚡</span>
              <span className="text-xl font-bold">ExtraHand</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-md p-1 flex mb-6 border-2 border-yellow-400">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              filter === 'all' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              filter === 'completed' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Completed ({orders.filter((o) => o.status === 'COMPLETED').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              filter === 'cancelled' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Cancelled ({orders.filter((o) => o.status === 'CANCELLED').length})
          </button>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-gray-200">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Orders Found</h3>
            <p className="text-gray-600 mb-6">You haven't placed any orders yet</p>
            <button
              onClick={() => router.push('/order/new')}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold transition-colors border-2 border-black"
            >
              Place Your First Order
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.taskId}
                className="bg-white rounded-xl shadow-md p-5 border-2 border-gray-200 hover:border-yellow-400 transition-all cursor-pointer"
                onClick={() => router.push(`/track/${order.taskId}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {order.status}
                      </span>
                      {order.rating && (
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-400">⭐</span>
                          <span className="text-sm font-bold text-gray-700">{order.rating}/5</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{order.taskId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Ordered</p>
                    <p className="text-sm font-semibold text-gray-700">{formatDate(order.createdAt)}</p>
                  </div>
                </div>

                {/* Item */}
                <div className="mb-3">
                  <p className="text-sm text-gray-600 font-semibold">Item:</p>
                  <p className="text-lg font-bold text-gray-900">{order.item || 'Package'}</p>
                </div>

                {/* Route */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-400 text-lg flex-shrink-0 mt-0.5">📍</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Pickup</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {order.pickup.address || `${order.pickup.lat.toFixed(6)}, ${order.pickup.lng.toFixed(6)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-400 text-lg flex-shrink-0 mt-0.5">🎯</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Drop</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {order.destination.address || `${order.destination.lat.toFixed(6)}, ${order.destination.lng.toFixed(6)}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t-2 border-gray-100">
                  {order.driver ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-black text-sm font-bold">
                        {order.driver.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Driver</p>
                        <p className="text-sm font-semibold text-gray-800">{order.driver.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No driver assigned</div>
                  )}

                  <div className="text-right">
                    {order.totalDistance && (
                      <p className="text-xs text-gray-500">{order.totalDistance.toFixed(1)} km</p>
                    )}
                    {order.totalDuration && (
                      <p className="text-sm font-semibold text-gray-700">{order.totalDuration} mins</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/track/${order.taskId}`);
                    }}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-2 rounded-lg font-bold transition-colors text-sm"
                  >
                    View Details
                  </button>
                  {order.status === 'COMPLETED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Reorder logic
                        router.push('/order/new');
                      }}
                      className="flex-1 bg-white hover:bg-gray-50 text-black py-2 rounded-lg font-bold transition-colors border-2 border-yellow-400 text-sm"
                    >
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
