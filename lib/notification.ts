type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  icon?: string;
  duration?: number;
}

type Subscriber = (notification: ToastNotification) => void;

class NotificationService {
  private isSupported: boolean = false;
  private isPermissionGranted: boolean = false;
  private subscribers: Subscriber[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window;
      this.isPermissionGranted = this.isSupported && Notification.permission === 'granted';
    }
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notify(notification: Omit<ToastNotification, 'id'>) {
    const toastNotification: ToastNotification = {
      ...notification,
      id: Math.random().toString(36).substring(7),
    };
    this.subscribers.forEach(sub => sub(toastNotification));
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.isPermissionGranted = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.isPermissionGranted = permission === 'granted';
      return this.isPermissionGranted;
    }

    return false;
  }

  showToast(
    type: ToastType,
    title: string,
    message?: string,
    options?: { duration?: number }
  ) {
    this.notify({
      type,
      title,
      message: message || '',
      duration: options?.duration || 3000,
    });
  }

  async showNotification(title: string, body: string, icon?: string) {
    if (!this.isPermissionGranted) {
      await this.requestPermission();
    }

    if (this.isPermissionGranted) {
      try {
        new Notification(title, {
          body,
          icon: icon || '/logo.png',
          badge: '/logo.png',
        });
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  }

  notifyStatusChange(status: string, driverName?: string) {
    const statusMessages: Record<string, { title: string; message: string; type: ToastType }> = {
      PENDING: {
        title: '🔍 Finding Partner',
        message: 'Looking for a delivery partner...',
        type: 'info',
      },
      PICKED_UP: {
        title: '📦 Package Picked Up',
        message: `${driverName || 'Driver'} has picked up your package`,
        type: 'success',
      },
      ON_THE_WAY: {
        title: '🚗 On the Way',
        message: `${driverName || 'Driver'} is on the way to deliver your package`,
        type: 'info',
      },
      ARRIVING: {
        title: '📍 Arriving Soon',
        message: `${driverName || 'Driver'} is arriving at your location`,
        type: 'warning',
      },
      COMPLETED: {
        title: '✅ Delivered',
        message: 'Your package has been delivered successfully!',
        type: 'success',
      },
      CANCELLED: {
        title: '❌ Cancelled',
        message: 'Delivery has been cancelled',
        type: 'error',
      },
    };

    const notification = statusMessages[status];
    if (notification) {
      this.showToast(notification.type, notification.title, notification.message, {
        duration: 5000,
      });
      
      this.showNotification(notification.title, notification.message);
    }
  }

  notifyProximity(distance: number, driverName?: string) {
    if (distance <= 0.5 && distance > 0.3) {
      this.showToast(
        'warning',
        '📍 Driver Nearby',
        `${driverName || 'Driver'} is ${distance.toFixed(1)} km away`,
        { duration: 4000 }
      );
    } else if (distance <= 0.3) {
      this.showToast(
        'warning',
        '🚨 Driver Very Close',
        `${driverName || 'Driver'} is arriving soon (${(distance * 1000).toFixed(0)} meters)`,
        { duration: 4000 }
      );
    }
  }

  notifyGeofenceEvent(
    eventType: 'entered' | 'exited' | 'approaching',
    zoneType: 'pickup' | 'destination',
    zoneName: string
  ) {
    const messages: Record<string, { title: string; message: string; type: ToastType }> = {
      'entered-pickup': {
        title: '📍 At Pickup',
        message: `Driver has arrived at ${zoneName}`,
        type: 'success',
      },
      'entered-destination': {
        title: '🎯 At Destination',
        message: `Driver has arrived at ${zoneName}`,
        type: 'success',
      },
      'approaching-pickup': {
        title: '🚗 Approaching Pickup',
        message: `Driver is near ${zoneName}`,
        type: 'info',
      },
      'approaching-destination': {
        title: '🏁 Approaching Destination',
        message: `Driver is near ${zoneName}`,
        type: 'warning',
      },
    };

    const key = `${eventType}-${zoneType}`;
    const notification = messages[key];
    
    if (notification) {
      this.showToast(notification.type, notification.title, notification.message, {
        duration: 4000,
      });
    }
  }

  notifyDeliveryUpdate(message: string, type: ToastType = 'info') {
    this.showToast(type, '📦 Delivery Update', message);
  }
}

export const notificationService = new NotificationService();
