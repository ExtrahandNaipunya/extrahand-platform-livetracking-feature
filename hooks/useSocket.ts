'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTrackingStore } from '@/store/useTrackingStore';
import axios from 'axios';

export function useSocket(taskId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    setConnected,
    updateLocation,
    updateETA,
    updateStatus,
    updateSpeed,
    updateRemainingDistance,
    checkGeofence,
  } = useTrackingStore();

  useEffect(() => {
    if (!taskId) return;

    console.log('🔵 WEBSOCKET: Initializing socket for task:', taskId);

    // Initialize Socket.IO client
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log('🟢 WEBSOCKET: Connected', socket.id);
      setConnected(true);

      // Join task-specific room
      socket.emit('subscribe', taskId);
      console.log('🔵 WEBSOCKET: Subscribed to task room:', taskId);
    });

    socket.on('disconnect', () => {
      console.log('🔴 WEBSOCKET: Disconnected');
      setConnected(false);
      startPolling();
    });

    socket.on('connect_error', (error) => {
      console.error('🔴 WEBSOCKET: Connection error', error);
      setConnected(false);
      startPolling();
    });

    // Listen for location updates
    socket.on('location_update', (data) => {
      console.log('🔵 WEBSOCKET: Received location_update', {
        lat: data.lat,
        lng: data.lng,
        status: data.status,
        eta: data.eta,
        speed: data.speed,
        remainingDistance: data.remainingDistance,
        distance: data.distance,
      });

      updateLocation({ lat: data.lat, lng: data.lng });
      updateETA(data.eta);
      checkGeofence({ lat: data.lat, lng: data.lng });
      updateStatus(data.status);

      if (data.speed !== undefined) updateSpeed(data.speed);
      if (data.remainingDistance !== undefined) updateRemainingDistance(data.remainingDistance);
    });

    // Listen for delivery completion updates
    socket.on('delivery_completed', (data) => {
      console.log('✅ WEBSOCKET: Received delivery_completed', {
        taskId: data.taskId,
        status: data.status,
        completedAt: data.completedAt,
      });

      updateStatus(data.status);

      // Update tracking data with completion info if available
      const { trackingData, setTrackingData } = useTrackingStore.getState();
      if (trackingData) {
        setTrackingData({
          ...trackingData,
          status: data.status,
          proofOfDelivery: data.proofOfDelivery,
        });
      }
    });

    // Fallback: Start polling if WebSocket fails
    const startPolling = () => {
      if (pollingIntervalRef.current) return;

      console.log('⏱️ POLLING: Started fallback polling');
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await axios.get(`/api/task/${taskId}/live`);
          const data = response.data;

          console.log('⏱️ POLLING: Fetched data', {
            lat: data.lat,
            lng: data.lng,
            status: data.status,
            speed: data.speed,
            remainingDistance: data.remainingDistance,
          });

          updateLocation({ lat: data.lat, lng: data.lng });
          updateETA(data.eta);
          updateStatus(data.status);
          checkGeofence({ lat: data.lat, lng: data.lng });

          if (data.speed !== undefined) updateSpeed(data.speed);
          if (data.remainingDistance !== undefined) updateRemainingDistance(data.remainingDistance);
        } catch (error) {
          console.error('⏱️ POLLING: Error fetching data', error);
        }
      }, 5000); // Poll every 5 seconds
    };

    // Cleanup
    return () => {
      console.log('🔵 WEBSOCKET: Cleaning up');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [taskId, setConnected, updateLocation, updateETA, updateStatus, updateSpeed, updateRemainingDistance, checkGeofence]);
}
