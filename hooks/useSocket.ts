import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTrackingStore } from '@/store/useTrackingStore';
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
    setError,
    useWebSocket,
    pollingInterval,
  } = useTrackingStore();

  // Polling fallback function
  const pollLocation = useCallback(async () => {
    if (!taskId) return;

    try {
      const response = await axios.get(`/api/task/${taskId}/live`);
      const data = response.data;

      updateLocation({ lat: data.lat, lng: data.lng });
      updateETA(data.eta);
      updateStatus(data.status);
      setError(null);
    } catch (error: any) {
      console.error('Polling error:', error);
      setError(error.response?.data?.error || 'Failed to fetch location');
    }
  }, [taskId, updateLocation, updateETA, updateStatus, setError]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Initial poll
    pollLocation();

    // Set up interval
    pollingIntervalRef.current = setInterval(pollLocation, pollingInterval);
    console.log('Started polling fallback');
  }, [pollLocation, pollingInterval]);

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
      transports: ['polling', 'websocket'], // Try polling first to avoid warning
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      upgrade: true,
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
      console.log('Location update received:', data);
      updateLocation({ lat: data.lat, lng: data.lng });
      updateETA(data.eta);
      updateStatus(data.status);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      
      // Start polling fallback after disconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('WebSocket reconnection failed, falling back to polling');
        startPolling();
      }, 5000);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setError('Connection error, using polling fallback');
      
      // Fallback to polling immediately on connection error
      if (!pollingIntervalRef.current) {
        startPolling();
      }
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      setError(error.message || 'WebSocket error occurred');
    });

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      socket.emit('unsubscribe', taskId);
      socket.disconnect();
      setConnected(false);
    };
  }, [taskId, useWebSocket, setConnected, updateLocation, updateETA, updateStatus, setError, startPolling, stopPolling]);

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
