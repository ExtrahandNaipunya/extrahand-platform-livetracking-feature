'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function OrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [taskId, setTaskId] = useState('');

  const [formData, setFormData] = useState({
    itemName: '',
    pickupAddress: '',
    deliveryAddress: '',
    customerName: '',
    customerPhone: '',
  });

  // Hyderabad locations for demo
  const demoLocations = {
    pickup: { lat: 17.385044, lng: 78.486671, name: 'Hitech City' },
    delivery: { lat: 17.440826, lng: 78.348449, name: 'Gachibowli' },
  };

  const handlePlaceOrder = async () => {
    if (!formData.itemName || !formData.customerName || !formData.customerPhone) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const newTaskId = `order_${Date.now()}`;

      // Create order
      const response = await axios.post('/api/order/create', {
        taskId: newTaskId,
        item: formData.itemName,
        pickup: {
          lat: demoLocations.pickup.lat,
          lng: demoLocations.pickup.lng,
          address: formData.pickupAddress || demoLocations.pickup.name,
        },
        destination: {
          lat: demoLocations.delivery.lat,
          lng: demoLocations.delivery.lng,
          address: formData.deliveryAddress || demoLocations.delivery.name,
        },
        customer: {
          name: formData.customerName,
          phone: formData.customerPhone,
        },
      });

      if (response.data.success) {
        setTaskId(newTaskId);
        setOrderPlaced(true);
        
        // Auto-redirect to tracking after 3 seconds
        setTimeout(() => {
          router.push(`/track/${newTaskId}`);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Order Placed!</h2>
          <p className="text-gray-600 mb-6">Finding a delivery partner for you...</p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Order ID</p>
            <p className="font-mono text-blue-600 font-semibold">{taskId}</p>
          </div>

          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Redirecting to tracking...</span>
          </div>

          <button
            onClick={() => router.push(`/track/${taskId}`)}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            View Tracking Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🛍️ Place Your Order
          </h1>
          <p className="text-gray-600">Get your items delivered fast & safe</p>
        </div>

        {/* Order Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            {/* Item Details */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                What do you want to order? *
              </label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="e.g., Groceries, Medicine, Food..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Pickup Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pickup Address
              </label>
              <input
                type="text"
                value={formData.pickupAddress}
                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                placeholder="Hitech City, Hyderabad (default)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">📍 {demoLocations.pickup.name}</p>
            </div>

            {/* Delivery Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Delivery Address
              </label>
              <input
                type="text"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                placeholder="Gachibowli, Hyderabad (default)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">📍 {demoLocations.delivery.name}</p>
            </div>

            <hr className="my-6" />

            {/* Customer Details */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Phone *
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+91-9876543210"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-2">📦 Order Summary</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Item: {formData.itemName || 'Not specified'}</p>
                <p>• Pickup: {formData.pickupAddress || demoLocations.pickup.name}</p>
                <p>• Delivery: {formData.deliveryAddress || demoLocations.delivery.name}</p>
                <p>• Estimated Time: ~30 mins</p>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Placing Order...
                </span>
              ) : (
                '🚀 Place Order & Find Delivery Partner'
              )}
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg p-4 text-center shadow">
            <div className="text-3xl mb-2">⚡</div>
            <p className="text-sm font-semibold text-gray-700">Fast Delivery</p>
            <p className="text-xs text-gray-500">Under 30 mins</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow">
            <div className="text-3xl mb-2">📍</div>
            <p className="text-sm font-semibold text-gray-700">Live Tracking</p>
            <p className="text-xs text-gray-500">Real-time updates</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm font-semibold text-gray-700">Safe & Secure</p>
            <p className="text-xs text-gray-500">Verified partners</p>
          </div>
        </div>
      </div>
    </div>
  );
}
