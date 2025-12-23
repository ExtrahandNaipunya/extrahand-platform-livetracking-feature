'use client';

import React, { useState } from 'react';
import { Waypoint } from '@/lib/multistop';
import { addWaypoint, removeWaypoint, optimizeWaypoints, calculateRouteDistance } from '@/lib/multistop';

interface MultiStopManagerProps {
  waypoints: Waypoint[];
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  onAddStop: () => void;
}

export default function MultiStopManager({ waypoints, onWaypointsChange, onAddStop }: MultiStopManagerProps) {
  const [showOptimize, setShowOptimize] = useState(false);

  const handleRemove = (index: number) => {
    const updated = removeWaypoint(waypoints, index);
    onWaypointsChange(updated);
  };

  const handleOptimize = () => {
    const optimized = optimizeWaypoints(waypoints);
    onWaypointsChange(optimized);
    setShowOptimize(false);
  };

  const totalDistance = calculateRouteDistance(waypoints);
  const canOptimize = waypoints.length > 3; // More than pickup + 1 stop + destination

  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-yellow-400">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <span className="text-yellow-400 mr-2">🗺️</span>
          Multi-Stop Route
          {waypoints.length > 2 && (
            <span className="ml-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
              {waypoints.length - 2} stops
            </span>
          )}
        </h3>
        {canOptimize && (
          <button
            onClick={() => setShowOptimize(true)}
            className="text-sm bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1.5 rounded-lg font-bold transition-colors"
          >
            ⚡ Optimize Route
          </button>
        )}
      </div>

      {/* Distance Summary */}
      {waypoints.length >= 2 && (
        <div className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Total Distance:</span>
            <span className="text-lg font-bold text-yellow-600">{totalDistance.toFixed(1)} km</span>
          </div>
        </div>
      )}

      {/* Waypoints List */}
      <div className="space-y-3 mb-4">
        {waypoints.map((waypoint, index) => (
          <div
            key={index}
            className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all ${
              waypoint.type === 'pickup'
                ? 'bg-green-50 border-green-300'
                : waypoint.type === 'destination'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-gray-50 border-gray-300 hover:border-yellow-400'
            }`}
          >
            {/* Order Number */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                waypoint.type === 'pickup'
                  ? 'bg-green-500 text-white'
                  : waypoint.type === 'destination'
                  ? 'bg-blue-500 text-white'
                  : 'bg-yellow-400 text-black'
              }`}
            >
              {index + 1}
            </div>

            {/* Waypoint Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">
                  {waypoint.type === 'pickup' ? '📍' : waypoint.type === 'destination' ? '🎯' : '🚩'}
                </span>
                <span className="text-xs font-bold text-gray-500 uppercase">
                  {waypoint.type === 'pickup' ? 'Pickup' : waypoint.type === 'destination' ? 'Destination' : waypoint.name || `Stop ${index}`}
                </span>
              </div>
              <p className="text-sm text-gray-800 truncate font-medium">
                {waypoint.address || `${waypoint.lat.toFixed(6)}, ${waypoint.lng.toFixed(6)}`}
              </p>
            </div>

            {/* Remove Button */}
            {waypoint.type === 'stop' && (
              <button
                onClick={() => handleRemove(index)}
                className="flex-shrink-0 w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors"
                title="Remove stop"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Stop Button */}
      {waypoints.length < 10 && (
        <button
          onClick={onAddStop}
          className="w-full bg-white hover:bg-gray-50 text-black py-3 rounded-lg font-bold transition-colors border-2 border-dashed border-yellow-400 flex items-center justify-center space-x-2"
        >
          <span className="text-xl">➕</span>
          <span>Add Stop ({waypoints.length - 2}/8)</span>
        </button>
      )}

      {waypoints.length >= 10 && (
        <div className="text-sm text-center text-gray-500 py-2">
          Maximum 8 additional stops reached
        </div>
      )}

      {/* Optimize Confirmation Modal */}
      {showOptimize && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-400">
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
              <span className="text-yellow-400 mr-2">⚡</span>
              Optimize Route?
            </h3>
            <p className="text-gray-700 mb-6">
              This will reorder your stops to find the shortest route while keeping pickup and destination fixed.
            </p>
            <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
              <p className="text-sm text-gray-700">
                <strong>Current distance:</strong> {totalDistance.toFixed(1)} km
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Optimized route may reduce travel time and distance
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowOptimize(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOptimize}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-bold transition-colors border-2 border-black"
              >
                Optimize Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
