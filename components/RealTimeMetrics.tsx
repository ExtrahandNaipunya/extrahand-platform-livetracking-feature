'use client';

import React from 'react';

interface RealTimeMetricsProps {
  speed?: number;
  remainingDistance?: number;
  currentStreet?: string;
  traffic?: 'light' | 'moderate' | 'heavy';
}

export default function RealTimeMetrics({ 
  speed, 
  remainingDistance, 
  currentStreet,
  traffic 
}: RealTimeMetricsProps) {
  const trafficColors = {
    light: 'bg-green-400',
    moderate: 'bg-yellow-400',
    heavy: 'bg-red-400',
  };

  const trafficLabels = {
    light: 'Light Traffic',
    moderate: 'Moderate Traffic',
    heavy: 'Heavy Traffic',
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-4 border-2 border-yellow-400 space-y-3">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
        <span className="text-yellow-400 mr-2">📊</span>
        Live Metrics
      </h3>

      {/* Speed Indicator */}
      <div className="flex items-center justify-between bg-gradient-to-r from-yellow-50 to-white p-3 rounded-lg border border-yellow-200">
        <div className="flex items-center space-x-2">
          <div className="bg-yellow-400 p-2 rounded-full">
            <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-semibold">Current Speed</p>
            <p className="text-2xl font-bold text-gray-900">
              {speed !== undefined ? speed.toFixed(0) : '--'}
              <span className="text-sm text-gray-500 ml-1">km/h</span>
            </p>
          </div>
        </div>
        <div className="text-3xl">🚗</div>
      </div>

      {/* Remaining Distance */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-white p-3 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-400 p-2 rounded-full">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-semibold">Distance Left</p>
            <p className="text-2xl font-bold text-gray-900">
              {remainingDistance !== undefined ? remainingDistance.toFixed(1) : '--'}
              <span className="text-sm text-gray-500 ml-1">km</span>
            </p>
          </div>
        </div>
        <div className="text-3xl">📍</div>
      </div>

      {/* Current Location */}
      {currentStreet && (
        <div className="bg-gradient-to-r from-purple-50 to-white p-3 rounded-lg border border-purple-200">
          <div className="flex items-start space-x-2">
            <div className="bg-purple-400 p-1.5 rounded-full flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 font-semibold mb-1">Current Location</p>
              <p className="text-sm font-medium text-gray-900 truncate">{currentStreet}</p>
            </div>
          </div>
        </div>
      )}

      {/* Traffic Status */}
      {traffic && (
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <div className={`${trafficColors[traffic]} w-3 h-3 rounded-full animate-pulse`}></div>
            <span className="text-sm font-semibold text-gray-700">{trafficLabels[traffic]}</span>
          </div>
          <div className="text-xl">🚦</div>
        </div>
      )}
    </div>
  );
}
