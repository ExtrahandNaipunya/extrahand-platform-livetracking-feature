'use client';

import React, { useState } from 'react';

interface Driver {
  name: string;
  phone: string;
  rating?: number;
  vehicle?: string;
}

interface BottomSheetProps {
  driver?: Driver;
  status: string;
  eta: string;
  distance?: number;
  speed?: number;
  currentStreet?: string;
  onCall?: () => void;
  onChat?: () => void;
  onShare?: () => void;
  onSOS?: () => void;
  insidePickupZone?: boolean;
  insideDestinationZone?: boolean;
  deliveryOTP?: string;
}

export default function BottomSheet({
  driver,
  status,
  eta,
  distance,
  speed,
  currentStreet,
  onCall,
  onChat,
  onShare,
  onSOS,
  insidePickupZone,
  insideDestinationZone,
  deliveryOTP,
}: BottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusText = () => {
    switch (status) {
      case 'PENDING':
        return 'Finding Partner...';
      case 'PICKED_UP':
        return 'Package Picked Up';
      case 'ON_THE_WAY':
        return 'On The Way';
      case 'ARRIVING':
        return 'Arriving Soon';
      case 'COMPLETED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'In Progress';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'PENDING':
        return '🔍';
      case 'PICKED_UP':
        return '📦';
      case 'ON_THE_WAY':
        return '🚗';
      case 'ARRIVING':
        return '📍';
      case 'COMPLETED':
        return '✅';
      case 'CANCELLED':
        return '❌';
      default:
        return '⏳';
    }
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t-4 border-yellow-400 transition-all duration-300 z-50 ${
        isExpanded ? 'h-[70vh]' : 'h-[300px]'
      }`}
    >
      {/* Drag Handle */}
      <div 
        className="flex justify-center py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
      </div>

      <div className="px-4 pb-6 overflow-y-auto h-full">
        {/* Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">{getStatusIcon()}</div>
            <div>
              <p className="text-lg font-bold text-gray-800">{getStatusText()}</p>
              <p className="text-sm text-gray-600">ETA: {eta}</p>
            </div>
          </div>
          {distance && (
            <div className="text-right">
              <p className="text-xl font-bold text-gray-800">{distance.toFixed(1)} km</p>
              {speed && <p className="text-xs text-gray-600">{speed.toFixed(0)} km/h</p>}
            </div>
          )}
        </div>

        {/* OTP Display */}
        {deliveryOTP && status !== 'COMPLETED' && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold mb-1 text-blue-100">🔐 YOUR DELIVERY OTP</p>
            <p className="text-3xl font-black tracking-widest text-center">{deliveryOTP}</p>
            <p className="text-xs text-blue-100 mt-1 text-center">
              Share this with the delivery partner
            </p>
          </div>
        )}

        {/* Geofence Status */}
        {(insidePickupZone || insideDestinationZone) && (
          <div className="bg-green-50 border-2 border-green-400 rounded-xl p-3 mb-4">
            {insidePickupZone && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-xl">📍</span>
                <span className="font-semibold text-green-700">Driver at pickup location</span>
              </div>
            )}
            {insideDestinationZone && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-xl">🎯</span>
                <span className="font-semibold text-green-700">Driver at destination</span>
              </div>
            )}
          </div>
        )}

        {/* Driver Card */}
        {driver ? (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-black">{driver.name.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{driver.name}</p>
                {driver.rating && (
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">⭐</span>
                    <span className="text-sm font-semibold text-gray-600">{driver.rating}</span>
                  </div>
                )}
                {driver.vehicle && (
                  <p className="text-xs text-gray-600">{driver.vehicle}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onCall}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-bold flex items-center justify-center space-x-2"
              >
                <span>📞</span>
                <span>Call</span>
              </button>
              <button
                onClick={onChat}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-bold flex items-center justify-center space-x-2"
              >
                <span>💬</span>
                <span>Chat</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm font-semibold text-gray-600">Finding Delivery Partner...</p>
          </div>
        )}

        {/* Current Street */}
        {currentStreet && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Current Location</p>
            <p className="text-sm font-semibold text-gray-800">{currentStreet}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <button
            onClick={onShare}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-bold flex items-center justify-center space-x-2"
          >
            <span>📤</span>
            <span>Share Trip</span>
          </button>
          <button
            onClick={onSOS}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold flex items-center justify-center space-x-2"
          >
            <span>🚨</span>
            <span>Emergency SOS</span>
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-6 space-y-4">
            <div className="border-t-2 border-gray-200 pt-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Delivery Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-gray-800">{getStatusText()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ETA:</span>
                  <span className="font-semibold text-gray-800">{eta}</span>
                </div>
                {distance && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-semibold text-gray-800">{distance.toFixed(1)} km</span>
                  </div>
                )}
                {speed && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Speed:</span>
                    <span className="font-semibold text-gray-800">{speed.toFixed(0)} km/h</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
