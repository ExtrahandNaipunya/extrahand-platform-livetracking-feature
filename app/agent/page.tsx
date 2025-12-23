'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface PendingOrder {
  taskId: string;
  item: string;
  pickup: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  customer: { name: string; phone: string };
  createdAt: string;
  distance?: number;
}

export default function DeliveryAgentPage() {
  const router = useRouter();
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Login as delivery agent
  const handleLogin = async () => {
    if (!agentName || !agentPhone) {
      alert('Please enter your details');
      return;
    }

    const id = `agent_${Date.now()}`;
    setAgentId(id);
    setIsLoggedIn(true);
    
    // Fetch orders immediately on login
    await pollForOrders(id);
  };

  // Poll for pending orders
  const pollForOrders = async (id: string) => {
    try {
      const response = await axios.get('/api/agent/pending-orders');
      if (response.data.orders) {
        setPendingOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Accept order
  const handleAcceptOrder = async (order: PendingOrder) => {
    setLoading(true);

    try {
      // Accept the order
      await axios.post('/api/agent/accept-order', {
        taskId: order.taskId,
        agentId: agentId,
        agentName: agentName,
        agentPhone: agentPhone,
      });

      // Redirect to navigation page
      router.push(`/agent/navigate/${order.taskId}`);
    } catch (error: any) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh orders every 5 seconds
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      pollForOrders(agentId);
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoggedIn, agentId]);

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🚗</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Delivery Partner
            </h1>
            <p className="text-gray-600">Login to start accepting orders</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Rajesh Kumar"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Phone
              </label>
              <input
                type="tel"
                value={agentPhone}
                onChange={(e) => setAgentPhone(e.target.value)}
                placeholder="+91-9876543210"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
            >
              🚀 Start Delivering
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <div className="text-2xl mb-1">💰</div>
                <p className="text-gray-600">Earn More</p>
              </div>
              <div>
                <div className="text-2xl mb-1">📍</div>
                <p className="text-gray-600">GPS Guided</p>
              </div>
              <div>
                <div className="text-2xl mb-1">⭐</div>
                <p className="text-gray-600">Build Rating</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Orders Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">👋 Hey, {agentName}!</h1>
              <p className="text-green-100 text-sm">Ready to deliver?</p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            📦 Available Orders ({pendingOrders.length})
          </h2>
          <p className="text-gray-600 text-sm">Accept orders and start earning!</p>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Orders Available
            </h3>
            <p className="text-gray-500">
              Waiting for new delivery requests...
            </p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
              <span className="text-sm text-gray-600">Checking for orders...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div
                key={order.taskId}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      📦 {order.item}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Order ID: {order.taskId.slice(0, 16)}...
                    </p>
                  </div>
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                    NEW
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-green-500 mt-1">📍</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Pickup</p>
                      <p className="text-sm text-gray-600">{order.pickup.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="text-red-500 mt-1">📍</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Delivery</p>
                      <p className="text-sm text-gray-600">{order.destination.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="text-blue-500 mt-1">👤</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Customer</p>
                      <p className="text-sm text-gray-600">
                        {order.customer.name} • {order.customer.phone}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleAcceptOrder(order)}
                    disabled={loading}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {loading ? '⏳ Accepting...' : '✅ Accept Order'}
                  </button>
                  <button className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    ℹ️ Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
