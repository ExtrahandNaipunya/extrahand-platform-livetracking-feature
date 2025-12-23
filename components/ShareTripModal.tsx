'use client';

import React, { useState } from 'react';

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingUrl: string;
  eta: string;
}

export default function ShareTripModal({ isOpen, onClose, trackingUrl, eta }: ShareTripModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareMessage = `🚗 Track my delivery in real-time!

📍 Arriving in: ${eta}

🔗 ${trackingUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareSMS = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(shareMessage)}`;
    window.location.href = smsUrl;
  };

  const handleShareEmail = () => {
    const emailUrl = `mailto:?subject=Track My Delivery&body=${encodeURIComponent(shareMessage)}`;
    window.location.href = emailUrl;
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Track My Delivery',
          text: shareMessage,
          url: trackingUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-400 animate-bounce-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <span className="text-2xl mr-2">📤</span>
            Share Trip
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Share your live tracking link with friends or family
        </p>

        {/* Tracking Link */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 mb-4 flex items-center space-x-2">
          <input
            type="text"
            value={trackingUrl}
            readOnly
            className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1 rounded font-bold text-sm transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Share Options */}
        <div className="space-y-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-2 shadow-md"
            >
              <span className="text-xl">📱</span>
              <span>Share via...</span>
            </button>
          )}

          <button
            onClick={handleShareWhatsApp}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-2 shadow-md"
          >
            <span className="text-xl">💬</span>
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleShareSMS}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-2 shadow-md"
          >
            <span className="text-xl">📨</span>
            <span>SMS</span>
          </button>

          <button
            onClick={handleShareEmail}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-2 shadow-md"
          >
            <span className="text-xl">✉️</span>
            <span>Email</span>
          </button>
        </div>
      </div>
    </div>
  );
}
