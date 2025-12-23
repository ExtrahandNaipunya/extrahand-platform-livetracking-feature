'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DriverInfo, TaskStatus } from '@/types';

interface BottomSheetProps {
  driver?: DriverInfo;
  status: TaskStatus;
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
  const [dragStartY, setDragStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    const deltaY = currentY - dragStartY;
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
      }
    }
    setDragStartY(0);
    setCurrentY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStartY(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragStartY > 0) {
      setCurrentY(e.clientY);
    }
  };

  const handleMouseUp = () => {
    const deltaY = currentY - dragStartY;
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
      }
    }
    setDragStartY(0);
    setCurrentY(0);
  };

  useEffect(() => {
    if (dragStartY > 0) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragStartY]);

  return (
    <div
      ref={sheetRef}
      className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t-4 border-yellow-400 transition-all duration-300 ease-out z-50 ${
        isExpanded ? 'h-[60vh]' : 'h-[180px]'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Drag Handle */}
      <div
        className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
      </div>

      <div className={`px-4 pb-6 overflow-y-auto ${isExpanded ? 'h-[calc(60vh-40px)]' : 'h-[140px]'}`}>
        {/* OTP Display - Mobile */}
        {deliveryOTP && status !== 'COMPLETED' && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 mb-4 shadow-lg">
            <p className="text-xs font-bold text-center text-blue-100 mb-1">🔐 DELIVERY OTP</p>
            <p className="text-4xl font-black text-center tracking-widest">{deliveryOTP}</p>
            <p className="text-xs text-center text-blue-100 mt-1">Share with driver at delivery</p>
          </div>
        )}

        {/* Quick Status Bar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-yellow-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {status === 'PENDING' && '🔍 Finding Partner'}
              {status === 'PICKED_UP' && '📦 Order Picked Up'}
              {status === 'ON_THE_WAY' && '🚗 On The Way'}
              {status === 'ARRIVING' && '📍 Arriving Soon'}
              {status === 'COMPLETED' && '✅ Completed'}
              {status === 'CANCELLED' && '❌ Cancelled'}
            </h3>
            <p className="text-sm text-gray-600">ETA: {eta}</p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold transition-colors"
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>

        {/* Driver Info */}
        {driver ? (
          <div className="bg-gradient-to-r from-yellow-50 to-white p-4 rounded-xl border-2 border-yellow-400 mb-4">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-black text-2xl font-bold border-4 border-black shadow-lg">
                {driver.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900">{driver.name}</h4>
                {driver.vehicleNumber && (
                  <p className="text-sm text-gray-600 font-semibold">{driver.vehicleNumber}</p>
                )}
                {driver.rating && (
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="text-yellow-400">⭐</span>
                    <span className="text-sm font-bold text-gray-700">{driver.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={onCall}
                className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-colors shadow-md flex flex-col items-center"
              >
                <span className="text-xl mb-1">📞</span>
                <span className="text-xs">Call</span>
              </button>
              <button
                onClick={onChat}
                className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold transition-colors shadow-md flex flex-col items-center"
              >
                <span className="text-xl mb-1">💬</span>
                <span className="text-xs">Chat</span>
              </button>
              <button
                onClick={onShare}
                className="bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-bold transition-colors shadow-md flex flex-col items-center"
              >
                <span className="text-xl mb-1">📤</span>
                <span className="text-xs">Share</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 text-center mb-4">
            <div className="text-5xl mb-3 animate-pulse">🔍</div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Finding Delivery Partner</h4>
            <p className="text-sm text-gray-600">We're searching for the best partner for your delivery...</p>
          </div>
        )}

        {/* Trip Details */}
        {isExpanded && (
          <div className="space-y-3 animate-slide-up">
            {/* Current Metrics */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                <span className="text-blue-500 mr-2">📊</span>
                Current Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Speed</p>
                  <p className="text-xl font-bold text-gray-900">
                    {speed !== undefined ? `${speed.toFixed(0)} km/h` : '--'}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Distance</p>
                  <p className="text-xl font-bold text-gray-900">
                    {distance !== undefined ? `${distance.toFixed(1)} km` : '--'}
                  </p>
                </div>
              </div>
            </div>

            {/* Current Location */}
            {currentStreet && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <span className="text-purple-500 mr-2">📍</span>
                  Current Location
                </h4>
                <p className="text-sm text-gray-900 font-medium">{currentStreet}</p>
              </div>
            )}

            {/* Safety Button */}
            <button
              onClick={onSOS}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center space-x-2"
            >
              <span className="text-xl">🚨</span>
              <span>Emergency SOS</span>
            </button>

            {/* Trip Timeline */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">Trip Timeline</h4>
              <div className="space-y-3">
                <TimelineItem
                  icon="✅"
                  label="Order Placed"
                  active={true}
                  completed={true}
                />
                <TimelineItem
                  icon="📦"
                  label="Picked Up"
                  active={status === 'PICKED_UP' || status === 'ON_THE_WAY' || status === 'ARRIVING' || status === 'COMPLETED'}
                  completed={status === 'ON_THE_WAY' || status === 'ARRIVING' || status === 'COMPLETED'}
                />
                <TimelineItem
                  icon="🚗"
                  label="On The Way"
                  active={status === 'ON_THE_WAY' || status === 'ARRIVING' || status === 'COMPLETED'}
                  completed={status === 'ARRIVING' || status === 'COMPLETED'}
                />
                <TimelineItem
                  icon="🎯"
                  label="Delivered"
                  active={status === 'COMPLETED'}
                  completed={status === 'COMPLETED'}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TimelineItemProps {
  icon: string;
  label: string;
  active: boolean;
  completed: boolean;
}

function TimelineItem({ icon, label, active, completed }: TimelineItemProps) {
  return (
    <div className="flex items-center space-x-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          completed
            ? 'bg-yellow-400 text-black'
            : active
            ? 'bg-yellow-200 text-black'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {icon}
      </div>
      <span className={`text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
