'use client';

import React, { useState, useEffect } from 'react';
import { notificationService, ToastNotification } from '@/lib/notification';

export default function ToastContainer() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications((prev) => [...prev, notification]);

      // Auto-remove after duration
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, notification.duration || 5000);
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 z-[9999] space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} onClose={removeNotification} />
      ))}
    </div>
  );
}

interface ToastProps {
  notification: ToastNotification;
  onClose: (id: string) => void;
}

function Toast({ notification, onClose }: ToastProps) {
  const typeStyles = {
    success: 'bg-green-50 border-green-400 text-green-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-900',
    error: 'bg-red-50 border-red-400 text-red-800',
  };

  const iconStyles = {
    success: 'text-green-400',
    info: 'text-blue-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div
      className={`${typeStyles[notification.type]} border-l-4 p-4 rounded-lg shadow-2xl animate-slide-in-right flex items-start space-x-3 min-w-[320px] backdrop-blur-sm`}
      role="alert"
    >
      {notification.icon && (
        <div className="text-2xl flex-shrink-0">
          {notification.icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
        <p className="text-xs opacity-90">{notification.message}</p>
      </div>

      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close notification"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
