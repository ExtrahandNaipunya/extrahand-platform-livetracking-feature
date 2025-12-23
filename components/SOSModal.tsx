'use client';

import React, { useState } from 'react';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverName?: string;
  driverPhone?: string;
  taskId: string;
}

export default function SOSModal({ isOpen, onClose, driverName, driverPhone, taskId }: SOSModalProps) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const emergencyNumbers = [
    { label: 'Police', number: '100', icon: '🚓' },
    { label: 'Ambulance', number: '108', icon: '🚑' },
    { label: 'Women Helpline', number: '1091', icon: '👮‍♀️' },
  ];

  const sosReasons = [
    '🚨 Safety concern with driver',
    '🚗 Accident or emergency',
    '😰 Feeling unsafe',
    '🔧 Vehicle breakdown',
    '📍 Wrong location/lost',
    '💬 Driver not responding',
  ];

  const handleSubmitSOS = () => {
    // In production, send SOS alert to support team
    console.log('SOS Alert:', { taskId, reason, timestamp: new Date().toISOString() });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 3000);
  };

  const handleCallEmergency = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-red-500 animate-bounce-in">
        {!submitted ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-600 flex items-center">
                <span className="text-3xl mr-2 animate-pulse">🚨</span>
                Emergency SOS
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
              <p className="text-sm text-red-800 font-semibold">
                ⚠️ Use this only in case of emergency. Your location and trip details will be shared with support team.
              </p>
            </div>

            {/* Emergency Contact Numbers */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-gray-700 mb-2">Emergency Services</h4>
              <div className="space-y-2">
                {emergencyNumbers.map((emergency) => (
                  <button
                    key={emergency.number}
                    onClick={() => handleCallEmergency(emergency.number)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-between px-4 shadow-md"
                  >
                    <span className="flex items-center space-x-2">
                      <span className="text-xl">{emergency.icon}</span>
                      <span>{emergency.label}</span>
                    </span>
                    <span className="text-lg font-mono">{emergency.number}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Report Issue */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-gray-700 mb-2">Report Issue to Support</h4>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 mb-3"
              >
                <option value="">Select issue...</option>
                {sosReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSubmitSOS}
                disabled={!reason}
                className={`w-full py-3 rounded-lg font-bold transition-colors shadow-md ${
                  reason
                    ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                📢 Alert Support Team
              </button>
            </div>

            {/* Driver Contact (if available) */}
            {driverName && driverPhone && (
              <div className="border-t-2 border-gray-200 pt-4">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Contact Driver</h4>
                <button
                  onClick={() => window.location.href = `tel:${driverPhone}`}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center space-x-2 shadow-md"
                >
                  <span className="text-xl">📞</span>
                  <span>Call {driverName}</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4 animate-pulse">✅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Alert Sent!</h3>
            <p className="text-gray-600">Our support team has been notified and will contact you shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
