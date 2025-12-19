'use client';

import React from 'react';
import { DriverInfo } from '@/types';

interface DriverCardProps {
  driver: DriverInfo;
  isConnected: boolean;
}

export default function DriverCard({ driver, isConnected }: DriverCardProps) {
  // If no driver assigned yet (PENDING status)
  if (!driver) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Finding Delivery Partner
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            We're looking for the best partner near you...
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Please wait</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {driver.name.charAt(0).toUpperCase()}
          </div>
          <div 
            className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
              isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800">{driver.name}</h3>
          <p className="text-sm text-gray-500">Your Delivery Partner</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <div className="text-sm text-gray-500">Phone</div>
            <div className="font-medium text-gray-800">{driver.phone}</div>
          </div>
        </div>

        {driver.vehicleNumber && (
          <div className="flex items-center space-x-3">
            <div className="text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-500">Vehicle</div>
              <div className="font-medium text-gray-800">{driver.vehicleNumber}</div>
            </div>
          </div>
        )}

        {driver.rating && (
          <div className="flex items-center space-x-3">
            <div className="text-gray-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-500">Rating</div>
              <div className="font-medium text-gray-800">{driver.rating.toFixed(1)} / 5.0</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex space-x-3">
        <a
          href={`tel:${driver.phone}`}
          className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-medium text-center hover:bg-primary-600 transition-colors"
        >
          Call Driver
        </a>
        <button
          className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Message
        </button>
      </div>

      {isConnected && (
        <div className="mt-4 flex items-center justify-center space-x-2 text-green-600 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow" />
          <span>Live tracking active</span>
        </div>
      )}
    </div>
  );
}
