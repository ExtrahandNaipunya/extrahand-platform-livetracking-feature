'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import LiveMap from '@/components/LiveMap';
import StatusPanel from '@/components/StatusPanel';
import DriverCard from '@/components/DriverCard';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useSocket } from '@/hooks/useSocket';
import { getRoute, generateFallbackRoute } from '@/lib/routing';

export default function TrackingPage() {
  const params = useParams();
  const taskId = params?.taskId as string;
  
  const {
    trackingData,
    currentLocation,
    isConnected,
    isLoading,
    error,
    setTaskId,
    setTrackingData,
    setLoading,
    setError,
  } = useTrackingStore();

  const [route, setRoute] = useState<Array<{ lat: number; lng: number }> | null>(null);

  // Initialize WebSocket/Polling
  useSocket(taskId);

  // Fetch initial tracking data
  useEffect(() => {
    if (!taskId) return;

    const fetchInitialData = async () => {
      setLoading(true);
      setTaskId(taskId);

      try {
        // Auto-initialize demo task if it's the demo
        if (taskId === 'demo-task-123') {
          try {
            await axios.get('/api/demo/init');
          } catch (initError) {
            console.log('Demo task may already exist, continuing...');
          }
        }

        const response = await axios.get(`/api/task/${taskId}/live`);
        const data = response.data;

        setTrackingData({
          taskId,
          pickup: data.pickup,
          destination: data.destination,
          currentLocation: { lat: data.lat, lng: data.lng },
          status: data.status,
          eta: data.eta,
          driver: data.driver,
          distance: data.distance,
          duration: data.duration,
        });

        // Fetch route from server-side API to avoid exposing API key
        try {
          const routeResponse = await axios.get(
            `/api/route/${taskId}?pickupLat=${data.pickup.lat}&pickupLng=${data.pickup.lng}&destLat=${data.destination.lat}&destLng=${data.destination.lng}`
          );
          if (routeResponse.data.route) {
            setRoute(routeResponse.data.route);
          } else {
            // Fallback to straight line
            const fallbackRoute = generateFallbackRoute(data.pickup, data.destination);
            setRoute(fallbackRoute);
          }
        } catch (routeError) {
          console.error('Error fetching route:', routeError);
          // Fallback to straight line on error
          const fallbackRoute = generateFallbackRoute(data.pickup, data.destination);
          setRoute(fallbackRoute);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching tracking data:', err);
        setError(err.response?.data?.error || 'Failed to load tracking data');
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [taskId, setTaskId, setTrackingData, setLoading, setError]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error && !trackingData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-500 text-5xl mb-4 text-center">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Tracking Unavailable
          </h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!trackingData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Live Tracking</h1>
              <p className="text-sm text-gray-500">Task ID: {taskId}</p>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Live' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
              <LiveMap
                pickup={trackingData.pickup}
                destination={trackingData.destination}
                currentLocation={currentLocation || trackingData.currentLocation}
                route={route || undefined}
                driverName={trackingData.driver.name}
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-6">
            <StatusPanel
              status={trackingData.status}
              eta={trackingData.eta}
              distance={trackingData.distance}
            />

            <DriverCard
              driver={trackingData.driver}
              isConnected={isConnected}
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{error}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
