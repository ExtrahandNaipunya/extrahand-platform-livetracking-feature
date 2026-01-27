'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function AgentDashboard() {
  const router = useRouter();
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentId, setAgentId] = useState('');

  useEffect(() => {
    // Get or create agent ID
    let id = localStorage.getItem('agentId');
    if (!id) {
      id = `agent_${Date.now()}`;
      localStorage.setItem('agentId', id);
    }
    setAgentId(id);
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/agent/pending-orders');
      setPendingOrders(response.data.orders || []);
      setActiveOrder(response.data.activeOrder || null);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acceptOrder = async (taskId: string) => {
    try {
      await axios.post('/api/agent/accept-order', {
        taskId,
        agentId,
      });

      // Navigate to the order
      router.push(`/agent/navigate/${taskId}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to accept order');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-yellow-400 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">Agent Dashboard</h1>
              <p className="text-gray-900 mt-1 font-medium">ID: {agentId}</p>
            </div>
            <button
              onClick={fetchOrders}
              className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Active Order */}
        {activeOrder && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Delivery</h2>
            <div className="bg-white border-2 border-yellow-400 rounded-2xl p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-bl-full -mr-16 -mt-16 z-0"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-yellow-600 font-bold mb-1">ORDER #{activeOrder.taskId.slice(-8)}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-2">{activeOrder.item || 'Package'}</p>
                  <p className="text-gray-600">{activeOrder.customer?.name}</p>
                </div>
                <button
                  onClick={() => router.push(`/agent/navigate/${activeOrder.taskId}`)}
                  className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  Continue Delivery →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Orders */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Available Orders ({pendingOrders.length})
          </h2>

          {pendingOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-md border border-gray-100">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Orders Available</h3>
              <p className="text-gray-600">Check back soon for new delivery requests</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingOrders.map((order) => (
                <div
                  key={order.taskId}
                  className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 hover:border-yellow-400 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold">
                          NEW
                        </span>
                        <p className="text-sm text-gray-600 font-semibold">
                          Order #{order.taskId.slice(-8)}
                        </p>
                      </div>

                      <p className="text-xl font-bold text-gray-900 mb-2">
                        {order.item || 'Package Delivery'}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <span className="text-yellow-500">📍</span>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold">PICKUP</p>
                            <p className="text-sm text-gray-700">{order.pickup?.address || 'Pickup location'}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-black">📍</span>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold">DESTINATION</p>
                            <p className="text-sm text-gray-700">{order.destination?.address || 'Destination'}</p>
                          </div>
                        </div>
                      </div>

                      {order.customer && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 font-semibold mb-1">CUSTOMER</p>
                          <p className="text-sm font-semibold text-gray-900">{order.customer.name}</p>
                          <p className="text-sm text-gray-600">{order.customer.phone}</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => acceptOrder(order.taskId)}
                      className="ml-6 bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                    >
                      Accept Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
