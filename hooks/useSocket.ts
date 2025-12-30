import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTrackingStore } from '@/store/useTrackingStore';
import { notificationService } from '@/lib/notification';
import axios from 'axios';

export function useSocket(taskId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    setConnected,
    updateLocation,
    updateETA,
    updateStatus,
    updateSpeed,
    updateRemainingDistance,
    updateCurrentStreet,
    setError,
    useWebSocket,
    pollingInterval,
    trackingData,
    previousStatus,
    previousDistance,
    checkGeofence,
  } = useTrackingStore();

  // Polling fallback function with movement validation
  const pollLocation = useCallback(async () => {
    if (!taskId) return;

    try {
      const response = await axios.get(`/api/task/${taskId}/live`);
      const data = response.data;

      // Validate location change - only update if significant movement
      const currentLoc = trackingData?.currentLocation;
      if (currentLoc) {
        const distance = Math.sqrt(
          Math.pow(data.lat - currentLoc.lat, 2) + 
          Math.pow(data.lng - currentLoc.lng, 2)
        );
        // Only update if moved more than 0.0001 degrees (~11 meters)
        if (distance < 0.0001) {
          return; // Skip minor jitter
        }
      }

      updateLocation({ lat: data.lat, lng: data.lng });
      updateETA(data.eta);
      
      // Check geofence
      checkGeofence({ lat: data.lat, lng: data.lng });
      
      // Check for status change and notify
      if (data.status !== previousStatus && previousStatus !== null) {
        notificationService.notifyStatusChange(data.status, data.driver?.name);
      }
      updateStatus(data.status);
      
      // Update additional data
      if (data.speed !== undefined) updateSpeed(data.speed);
      if (data.remainingDistance !== undefined) {
        updateRemainingDistance(data.remainingDistance);
        // Proximity notification - only on significant distance change (>100m)
        if (Math.abs(data.remainingDistance - (previousDistance || 0)) > 0.1) {
          notificationService.notifyProximity(data.remainingDistance, data.driver?.name);
        }
      }
      if (data.currentStreet) updateCurrentStreet(data.currentStreet);
      
      setError(null);
    } catch (error: any) {
      console.error('Polling error:', error);
      setError(error.response?.data?.error || 'Failed to fetch location');
    }
  }, [taskId, updateLocation, updateETA, updateStatus, updateSpeed, updateRemainingDistance, updateCurrentStreet, setError, previousStatus, previousDistance, trackingData?.currentLocation, checkGeofence]);

  // Start polling with improved interval
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Initial poll
    pollLocation();

    // Set up interval - 5 seconds for smoother animations
    pollingIntervalRef.current = setInterval(pollLocation, 5000);
    console.log('Started polling fallback (5s interval)');
  }, [pollLocation]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('Stopped polling');
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!taskId || !useWebSocket) {
      // Use polling if WebSocket is disabled
      if (!useWebSocket && taskId) {
        startPolling();
      }
      return;
    }

    // Initialize WebSocket connection
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 3,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);
      
      // Subscribe to task updates
      socket.emit('subscribe', taskId);
      
      // Stop polling if it was running
      stopPolling();
    });

    socket.on('location_update', (data) => {
      updateLocation({ lat: data.lat, lng: data.lng });
      updateETA(data.eta);
      
      // Check geofence
      checkGeofence({ lat: data.lat, lng: data.lng });
      
      // Check for status change and notify
      if (data.status !== previousStatus && previousStatus !== null) {
        notificationService.notifyStatusChange(data.status, data.driver?.name);
      }
      updateStatus(data.status);
      
      // Update additional real-time data
      if (data.speed !== undefined) updateSpeed(data.speed);
      if (data.remainingDistance !== undefined) {
        updateRemainingDistance(data.remainingDistance);
        // Proximity notification
        if (data.remainingDistance !== previousDistance) {
          notificationService.notifyProximity(data.remainingDistance, data.driver?.name);
        }
      }
      if (data.currentStreet) updateCurrentStreet(data.currentStreet);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      
      // Start polling fallback after disconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!socketRef.current?.connected) {
          console.log('Falling back to polling');
          startPolling();
        }
      }, 5000);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setConnected(false);
      
      // Fallback to polling on connection error
      if (!pollingIntervalRef.current) {
        startPolling();
      }
    });

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socket.connected) {
        socket.emit('unsubscribe', taskId);
      }
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [taskId, useWebSocket]); // Minimal dependencies

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [stopPolling]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
  };
}
