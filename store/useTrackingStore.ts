import { create } from 'zustand';
import { TrackingData, TaskStatus, Location } from '@/types';

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
  
  // Actions
  setTaskId: (taskId: string) => void;
  setTrackingData: (data: TrackingData) => void;
  updateLocation: (location: Location) => void;
  updateETA: (eta: string) => void;
  updateStatus: (status: TaskStatus) => void;
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
  pollingInterval: 3000, // 3 seconds
  
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
  })),
  
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
  }),
}));
