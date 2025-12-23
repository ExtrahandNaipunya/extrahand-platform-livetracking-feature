// Notification service for toast and browser notifications
import { TaskStatus } from '@/types';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  icon?: string;
  sound?: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private listeners: ((notification: ToastNotification) => void)[] = [];
  private notificationPermission: NotificationPermission = 'default';

  private constructor() {
    this.checkPermission();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Check browser notification permission
  async checkPermission(): Promise<void> {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  // Request permission for browser notifications
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (this.notificationPermission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.notificationPermission = permission;
    return permission === 'granted';
  }

  // Subscribe to notifications
  subscribe(listener: (notification: ToastNotification) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Show toast notification
  showToast(
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      duration?: number;
      icon?: string;
      sound?: boolean;
    }
  ): void {
    const notification: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      duration: options?.duration || 5000,
      icon: options?.icon,
      sound: options?.sound || false,
    };

    // Notify all listeners
    this.listeners.forEach((listener) => listener(notification));

    // Play sound if enabled
    if (options?.sound) {
      this.playNotificationSound(type);
    }
  }

  // Show browser push notification
  async showPushNotification(
    title: string,
    message: string,
    options?: {
      icon?: string;
      badge?: string;
      tag?: string;
      requireInteraction?: boolean;
    }
  ): Promise<void> {
    if (this.notificationPermission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    try {
      const notification = new Notification(title, {
        body: message,
        icon: options?.icon || '/icon.png',
        badge: options?.badge || '/badge.png',
        tag: options?.tag || 'extrahand-notification',
        requireInteraction: options?.requireInteraction || false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      // Try to vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      console.error('Failed to show push notification:', error);
    }
  }

  // Play notification sound
  private playNotificationSound(type: NotificationType): void {
    try {
      const audio = new Audio();
      // Use different frequencies for different types
      const frequencies = {
        success: 800,
        info: 600,
        warning: 500,
        error: 400,
      };

      // Create simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequencies[type];
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  // Status change notifications
  notifyStatusChange(status: TaskStatus, driverName?: string): void {
    const statusMessages: Record<TaskStatus, { title: string; message: string; type: NotificationType; icon: string }> = {
      PENDING: {
        title: '🔍 Finding Delivery Partner',
        message: 'We are searching for a delivery partner near you...',
        type: 'info',
        icon: '🔍',
      },
      PICKED_UP: {
        title: '📦 Order Picked Up',
        message: `${driverName || 'Your driver'} has picked up your order and is on the way!`,
        type: 'success',
        icon: '📦',
      },
      ON_THE_WAY: {
        title: '🚗 Driver On The Way',
        message: `${driverName || 'Your driver'} is heading to the destination`,
        type: 'info',
        icon: '🚗',
      },
      ARRIVING: {
        title: '📍 Driver Arriving Soon',
        message: `${driverName || 'Your driver'} will arrive in a few minutes!`,
        type: 'warning',
        icon: '📍',
      },
      COMPLETED: {
        title: '✅ Delivery Completed',
        message: 'Your order has been delivered successfully!',
        type: 'success',
        icon: '✅',
      },
      CANCELLED: {
        title: '❌ Order Cancelled',
        message: 'This order has been cancelled',
        type: 'error',
        icon: '❌',
      },
    };

    const config = statusMessages[status];
    this.showToast(config.type, config.title, config.message, {
      duration: 6000,
      icon: config.icon,
      sound: true,
    });

    // Also show browser notification for important statuses
    if (['PICKED_UP', 'ARRIVING', 'COMPLETED'].includes(status)) {
      this.showPushNotification(config.title, config.message, {
        requireInteraction: status === 'ARRIVING',
      });
    }
  }

  // Proximity notifications
  notifyProximity(distanceKm: number, driverName?: string): void {
    if (distanceKm <= 0.5 && distanceKm > 0.3) {
      this.showToast('warning', '🚗 Driver Nearby', `${driverName || 'Your driver'} is less than 500m away!`, {
        duration: 5000,
        sound: true,
      });
      this.showPushNotification('Driver Nearby', `${driverName || 'Your driver'} is approaching your location`);
    } else if (distanceKm <= 0.3) {
      this.showToast('warning', '📍 Driver Arriving', `${driverName || 'Your driver'} is arriving now!`, {
        duration: 7000,
        sound: true,
      });
    }
  }

  // ETA notifications
  notifyETAUpdate(eta: string, isDelay: boolean): void {
    if (isDelay) {
      this.showToast('warning', '⏱️ Updated Arrival Time', `New estimated arrival: ${eta}`, {
        duration: 5000,
      });
    }
  }

  // Geofence notifications
  notifyGeofenceEvent(eventType: 'entered' | 'approaching', zoneType: 'pickup' | 'destination', zoneName?: string): void {
    const messages = {
      pickup: {
        entered: {
          title: '📍 Arrived at Pickup',
          message: `Driver has arrived at ${zoneName || 'pickup location'}`,
          type: 'success' as const,
          sound: true,
        },
        approaching: {
          title: '🚗 Driver Approaching Pickup',
          message: `Driver is near ${zoneName || 'pickup location'}`,
          type: 'info' as const,
          sound: true,
        },
      },
      destination: {
        entered: {
          title: '🎯 Arrived at Destination',
          message: `Driver has reached ${zoneName || 'your destination'}!`,
          type: 'success' as const,
          sound: true,
        },
        approaching: {
          title: '📍 Almost There',
          message: `Driver is approaching ${zoneName || 'destination'}`,
          type: 'warning' as const,
          sound: true,
        },
      },
    };

    const config = messages[zoneType][eventType];
    this.showToast(config.type, config.title, config.message, {
      duration: 6000,
      sound: config.sound,
    });

    // Browser notification for arrivals
    if (eventType === 'entered') {
      this.showPushNotification(config.title, config.message, {
        requireInteraction: true,
      });
    }
  }
}

export const notificationService = NotificationService.getInstance();
