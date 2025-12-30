import { create } from 'zustand';
import { TrackingData, TaskStatus, Location } from '@/types';
import { GeofenceMonitor, createGeofenceZones, GeofenceEvent } from '@/lib/geofencing';

interface TrackingStore {
  // Data
  taskId: string | null;
  trackingData: TrackingData | null;
  currentLocation: Location | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // WebSocket
  useWebSocket: boolean;
  pollingInterval: number;
  
  // Previous state for comparison
  previousStatus: TaskStatus | null;
  previousDistance: number | null;
  
  // Geofencing
  geofenceMonitor: GeofenceMonitor | null;
  insidePickupZone: boolean;
  insideDestinationZone: boolean;
  lastGeofenceEvent: GeofenceEvent | null;
  
  // Actions
  setTaskId: (taskId: string) => void;
  setTrackingData: (data: TrackingData) => void;
  updateLocation: (location: Location) => void;
  updateETA: (eta: string) => void;
  updateStatus: (status: TaskStatus) => void;
  updateSpeed: (speed: number) => void;
  updateRemainingDistance: (distance: number) => void;
  updateCurrentStreet: (street: string) => void;
  initializeGeofencing: (pickup: Location, destination: Location) => void;
  checkGeofence: (location: Location) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleWebSocket: (use: boolean) => void;
  reset: () => void;
}

export const useTrackingStore = create<TrackingStore>((set) => ({
  // Initial state
  taskId: null,
  trackingData: null,
  currentLocation: null,
  isConnected: false,
  isLoading: false,
  error: null,
  useWebSocket: true,
  pollingInterval: 5000, // 5 seconds for smoother animations
  previousStatus: null,
  previousDistance: null,
  geofenceMonitor: null,
  insidePickupZone: false,
  insideDestinationZone: false,
  lastGeofenceEvent: null,
  
  // Actions
  setTaskId: (taskId) => set({ taskId }),
  
  setTrackingData: (data) => set({ 
    trackingData: data,
    currentLocation: data.currentLocation,
    error: null,
  }),
  
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
    previousStatus: state.trackingData?.status || null,
  })),
  
  updateSpeed: (speed) => set((state) => ({
    trackingData: state.trackingData 
      ? { ...state.trackingData, speed }
      : null,
  })),
  
  updateRemainingDistance: (remainingDistance) => set((state) => ({
    trackingData: state.trackingData 
      ? { ...state.trackingData, remainingDistance }
      : null,
    previousDistance: state.trackingData?.remainingDistance || null,
  })),
  
  updateCurrentStreet: (currentStreet) => set((state) => ({
    trackingData: state.trackingData 
      ? { ...state.trackingData, currentStreet }
      : null,
  })),
  
  initializeGeofencing: (pickup, destination) => set(() => {
    const zones = createGeofenceZones(pickup, destination);
    const monitor = new GeofenceMonitor(zones);
    return { geofenceMonitor: monitor };
  }),
  
  checkGeofence: (location) => set((state) => {
    if (!state.geofenceMonitor) return {};
    
    const events = state.geofenceMonitor.checkLocation(location);
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      return {
        lastGeofenceEvent: latestEvent,
        insidePickupZone: latestEvent.zone.type === 'pickup' && latestEvent.type === 'entered' ? true : state.insidePickupZone,
        insideDestinationZone: latestEvent.zone.type === 'destination' && latestEvent.type === 'entered' ? true : state.insideDestinationZone,
      };
    }
    return {};
  }),
  
  setConnected: (connected) => set({ isConnected: connected }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  toggleWebSocket: (use) => set({ useWebSocket: use }),
  
  reset: () => set({
    taskId: null,
    trackingData: null,
    currentLocation: null,
    isConnected: false,
    isLoading: false,
    error: null,
    previousStatus: null,
    previousDistance: null,
    geofenceMonitor: null,
    insidePickupZone: false,
    insideDestinationZone: false,
    lastGeofenceEvent: null,
  }),
}));
