'use client';

import React from 'react';
import Link from 'next/link';

interface EnhancedTrackingHeaderProps {
  taskId: string;
  isConnected: boolean;
  customerName?: string;
  itemName?: string;
}

export default function EnhancedTrackingHeader({
  taskId,
  isConnected,
  customerName,
  itemName,
}: EnhancedTrackingHeaderProps) {
  return (
    <header className="bg-white text-black shadow-2xl sticky top-0 z-50 border-b-4 border-yellow-400">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Top Row */}
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <span className="text-3xl text-yellow-400">⚡</span>
            <span className="text-2xl font-bold text-black">ExtraHand</span>
          </Link>
          
          <div className="flex items-center space-x-3">
            {/* Live Status Indicator */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border-2 ${
              isConnected ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-100 border-gray-400'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm font-bold">
                {isConnected ? 'LIVE' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-yellow-500">📍 Live Tracking</h1>
            <div className="flex items-center space-x-3 text-sm text-gray-700">
              {itemName && (
                <span className="flex items-center space-x-1">
                  <span>📦</span>
                  <span>{itemName}</span>
                </span>
              )}
              {customerName && (
                <span className="flex items-center space-x-1">
                  <span>👤</span>
                  <span>{customerName}</span>
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-yellow-600 mb-1 font-semibold">Order ID</p>
            <p className="text-sm font-mono bg-yellow-100 px-3 py-1 rounded border-2 border-yellow-400 text-black">
              {taskId.slice(0, 16)}...
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
