'use client';

import React from 'react';
import { TaskStatus } from '@/types';

interface StatusPanelProps {
  status: TaskStatus;
  eta: string;
  distance?: number;
}

const statusConfig = {
  PENDING: {
    label: 'Finding Partner',
    color: 'bg-yellow-400',
    textColor: 'text-black',
    icon: '🔍',
  },
  ASSIGNED: {
    label: 'Partner Assigned',
    color: 'bg-yellow-400',
    textColor: 'text-black',
    icon: '🛵',
  },
  PICKED_UP: {
    label: 'Picked Up',
    color: 'bg-yellow-400',
    textColor: 'text-black',
    icon: '📦',
  },
  ON_THE_WAY: {
    label: 'On the Way',
    color: 'bg-yellow-400',
    textColor: 'text-black',
    icon: '🚗',
  },
  ARRIVING: {
    label: 'Arriving Soon',
    color: 'bg-yellow-400',
    textColor: 'text-black',
    icon: '📍',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-gray-800',
    textColor: 'text-white',
    icon: '✅',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-500',
    textColor: 'text-white',
    icon: '❌',
  },
};

export default function StatusPanel({ status, eta, distance }: StatusPanelProps) {
  const config = statusConfig[status] || statusConfig.ON_THE_WAY;

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 border-2 border-yellow-400">
      <div className="flex items-center space-x-4 mb-4">
        <div className={`${config.color} ${config.textColor} px-4 py-2 rounded-full text-2xl font-bold`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{config.label}</h3>
          <p className="text-sm text-gray-500">Delivery Status</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-400">
          <div className="text-sm text-gray-600 mb-1 font-semibold">⏱️ Estimated Time</div>
          <div className="text-2xl font-bold text-gray-900">{eta}</div>
        </div>

        {distance !== undefined && (
          <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-400">
            <div className="text-sm text-gray-600 mb-1 font-semibold">📍 Distance</div>
            <div className="text-2xl font-bold text-gray-900">
              {distance.toFixed(1)} km
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`${config.color} h-2 rounded-full transition-all duration-500`}
              style={{
                width: status === 'PENDING' ? '5%' :
                  status === 'ASSIGNED' ? '15%' :
                    status === 'PICKED_UP' ? '35%' :
                      status === 'ON_THE_WAY' ? '65%' :
                        status === 'ARRIVING' ? '85%' :
                          '100%',
              }}
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Pending</span>
          <span>Picked Up</span>
          <span>On the Way</span>
          <span>Delivered</span>
        </div>
      </div>
    </div>
  );
}
