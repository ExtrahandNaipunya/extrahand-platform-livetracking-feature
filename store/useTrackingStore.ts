import { create } from 'zustand';
import { calculateDistance } from '@/lib/geofencing';

interface Location {
  lat: number;
  lng: number;
}

interface Driver {
  name: string;
  phone: string;
  rating?: number;
  vehicle?: string;
}

interface TrackingData {
  taskId: string;
  pickup: Location & { address?: string };
  destination: Location & { address?: string };
  currentLocation: Location;
  status: string;
  eta: string;
  driver?: Driver;
  distance?: number;
  duration?: string;
  remainingDistance?: number;
  speed?: number;
  currentStreet?: string;
  traffic?: string;
  proofOfDelivery?: any;
  customer?: { name?: string };
  item?: string;
}

interface GeofenceZone {
  center: Location;
  radius: number;
  type: 'pickup' | 'destination';
  name: string;
}

interface GeofenceEvent {
  type: 'entered' | 'exited' | 'approaching';
  zone: GeofenceZone;
  timestamp: Date;
}

interface TrackingStore {
  taskId: string | null;
  trackingData: TrackingData | null;
  currentLocation: Location | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Geofencing
  pickupZone: GeofenceZone | null;
  destinationZone: GeofenceZone | null;
  insidePickupZone: boolean;
  insideDestinationZone: boolean;
  lastGeofenceEvent: GeofenceEvent | null;
  
  // Actions
  setTaskId: (taskId: string) => void;
  setTrackingData: (data: TrackingData) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateLocation: (location: Location) => void;
  updateETA: (eta: string) => void;
  updateStatus: (status: string) => void;
  updateSpeed: (speed: number) => void;
  updateRemainingDistance: (distance: number) => void;
  
  // Geofencing actions
  initializeGeofencing: (pickup: Location, destination: Location) => void;
  checkGeofence: (location: Location) => void;
}

export const useTrackingStore = create<TrackingStore>((set, get) => ({
  taskId: null,
  trackingData: null,
  currentLocation: null,
  isConnected: false,
  isLoading: false,
  error: null,
  
  // Geofencing state
  pickupZone: null,
  destinationZone: null,
  insidePickupZone: false,
  insideDestinationZone: false,
  lastGeofenceEvent: null,
  
  setTaskId: (taskId) => set({ taskId }),
  
  setTrackingData: (data) => set({ 
    trackingData: data,
    currentLocation: data.currentLocation,
  }),
  
  setConnected: (connected) => set({ isConnected: connected }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  updateLocation: (location) => set((state) => ({
    currentLocation: location,
    trackingData: state.trackingData 
      ? { ...state.trackingData, currentLocation: location }
      : null,
  })),
  
  updateETA: (eta) => set((state) => ({
    trackingData: state.trackingData 
      ? { ...state.trackingData, eta }
      : null,
  })),
  
  updateStatus: (status) => set((state) => ({
    trackingData: state.trackingData 
      ? { ...state.trackingData, status }
      : null,
  })),
  
  updateSpeed: (speed) => set((state) => ({
    trackingData: state.trackingData 
      ? { ...state.trackingData, speed }
      : null,
  })),
  
  updateRemainingDistance: (distance) => set((state) => ({
    trackingData: state.trackingData 
      ? { ...state.trackingData, remainingDistance: distance }
      : null,
  })),
  
  // Initialize geofencing zones
  initializeGeofencing: (pickup, destination) => {
    const pickupZone: GeofenceZone = {
      center: pickup,
      radius: 100, // 100 meters
      type: 'pickup',
      name: 'Pickup Location',
    };
    
    const destinationZone: GeofenceZone = {
      center: destination,
      radius: 100, // 100 meters
      type: 'destination',
      name: 'Destination',
    };
    
    set({ 
      pickupZone,
      destinationZone,
    });
  },
  
  // Check if driver is inside geofence zones
  checkGeofence: (location) => {
    const { pickupZone, destinationZone, insidePickupZone, insideDestinationZone } = get();
    
    if (!pickupZone || !destinationZone) return;
    
    // Calculate distances
    const distanceToPickup = calculateDistance(location, pickupZone.center);
    const distanceToDestination = calculateDistance(location, destinationZone.center);
    
    // Check pickup zone
    const nowInsidePickup = distanceToPickup <= pickupZone.radius;
    if (nowInsidePickup !== insidePickupZone) {
      set({ 
        insidePickupZone: nowInsidePickup,
        lastGeofenceEvent: {
          type: nowInsidePickup ? 'entered' : 'exited',
          zone: pickupZone,
          timestamp: new Date(),
        },
      });
    } else if (!nowInsidePickup && distanceToPickup <= pickupZone.radius * 3) {
      // Approaching (within 3x radius)
      set({
        lastGeofenceEvent: {
          type: 'approaching',
          zone: pickupZone,
          timestamp: new Date(),
        },
      });
    }
    
    // Check destination zone
    const nowInsideDestination = distanceToDestination <= destinationZone.radius;
    if (nowInsideDestination !== insideDestinationZone) {
      set({ 
        insideDestinationZone: nowInsideDestination,
        lastGeofenceEvent: {
          type: nowInsideDestination ? 'entered' : 'exited',
          zone: destinationZone,
          timestamp: new Date(),
        },
      });
    } else if (!nowInsideDestination && distanceToDestination <= destinationZone.radius * 3) {
      // Approaching (within 3x radius)
      set({
        lastGeofenceEvent: {
          type: 'approaching',
          zone: destinationZone,
          timestamp: new Date(),
        },
      });
    }
  },
}));
