'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, Polyline, DirectionsRenderer } from '@react-google-maps/api';
import axios from 'axios';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

export default function AgentNavigationPage() {
  const params = useParams();
  const taskId = params?.taskId as string;

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
  });

  const [taskData, setTaskData] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [directions, setDirections] = useState<any>(null);
  const [distance, setDistance] = useState('');
  const [eta, setEta] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const mapRef = React.useRef<google.maps.Map | null>(null);

  // Fetch task data
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await axios.get(`/api/task/${taskId}/live`);
        setTaskData(response.data);
        setCurrentLocation(response.data.pickup); // Start at pickup
      } catch (error) {
        console.error('Error fetching task:', error);
      }
    };

    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  // Calculate route
  const calculateRoute = useCallback(async () => {
    if (!taskData || !currentLocation || !window.google) return;

    const directionsService = new google.maps.DirectionsService();

    try {
      const result = await directionsService.route({
        origin: currentLocation,
        destination: taskData.destination,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      });

      setDirections(result);
      
      // Extract distance and duration
      const leg = result.routes[0].legs[0];
      setDistance(leg.distance?.text || '');
      setEta(leg.duration?.text || '');
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  }, [taskData, currentLocation]);

  useEffect(() => {
    if (isLoaded && taskData && currentLocation) {
      calculateRoute();
    }
  }, [isLoaded, taskData, currentLocation, calculateRoute]);

  // Simulate movement
  const startNavigation = () => {
    setIsNavigating(true);
    
    // Update location every 3 seconds
    const interval = setInterval(async () => {
      if (!currentLocation || !taskData) return;

      // Move slightly towards destination
      const newLat = currentLocation.lat + (taskData.destination.lat - currentLocation.lat) * 0.05;
      const newLng = currentLocation.lng + (taskData.destination.lng - currentLocation.lng) * 0.05;

      const newLocation = { lat: newLat, lng: newLng };
      setCurrentLocation(newLocation);

      // Send update to server
      try {
        await axios.post('/api/driver/update', {
          taskId,
          driverId: taskData.driver?.id || 'agent_001',
          lat: newLat,
          lng: newLng,
          speed: 40,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }

      // Check if arrived
      const distanceToDestination = getDistance(newLocation, taskData.destination);
      if (distanceToDestination < 0.1) {
        clearInterval(interval);
        setIsNavigating(false);
        alert('🎉 You have arrived at the destination!');
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  // Calculate distance
  const getDistance = (p1: any, p2: any) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (!isLoaded || !taskData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading navigation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <span className="text-2xl">🧭</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Active Delivery</h1>
              <p className="text-sm text-green-100">Delivering: {taskData.item || 'Package'}</p>
            </div>
          </div>
          <div className="text-right bg-white/20 px-4 py-2 rounded-lg">
            <p className="text-2xl font-bold">{eta}</p>
            <p className="text-xs text-green-100">{distance} away</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={currentLocation}
          zoom={14}
          onLoad={(map) => { mapRef.current = map; }}
          options={{
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          {/* Current Location */}
          <Marker
            position={currentLocation}
            icon={{
              url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="3"/>
                  <path d="M20 8 L26 32 L20 26 L14 32 Z" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(40, 40),
            }}
            title="You are here"
          />

          {/* Destination */}
          <Marker
            position={taskData.destination}
            icon={{
              url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 24 36">
                  <path d="M12 0C7.6 0 4 3.6 4 8c0 6.6 8 16 8 16s8-9.4 8-16c0-4.4-3.6-8-8-8z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
                  <circle cx="12" cy="8" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 48),
            }}
            title="Destination"
          />

          {/* Route */}
          {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
        </GoogleMap>
      </div>

      {/* Bottom Controls */}
      <div className="bg-white border-t-2 border-gray-200 p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold mb-1">DISTANCE</p>
              <p className="text-lg font-bold text-blue-600">{distance}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border border-green-200">
              <p className="text-xs text-green-700 font-semibold mb-1">ETA</p>
              <p className="text-lg font-bold text-green-600">{eta}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200">
              <p className="text-xs text-purple-700 font-semibold mb-1">STATUS</p>
              <p className="text-lg font-bold text-purple-600">
                {isNavigating ? '🚗 Moving' : '⏸️ Ready'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={startNavigation}
              disabled={isNavigating}
              className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                isNavigating
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isNavigating ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Navigating...
                </span>
              ) : (
                '🚀 Start Navigation'
              )}
            </button>
            <button
              onClick={() => calculateRoute()}
              className="px-6 py-4 bg-white border-2 border-green-500 text-green-600 rounded-xl font-bold hover:bg-green-50 transition-colors shadow-md"
            >
              🔄
            </button>
          </div>

          {/* Customer Info */}
          {taskData.customer && (
            <div className="mt-3 bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
              <p className="text-sm text-blue-800">
                <strong>👤 Customer:</strong> {taskData.customer.name} • {taskData.customer.phone}
              </p>
            </div>
          )}

          {/* Tip */}
          <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
            <p className="text-sm text-yellow-800">
              <strong>💡 Tip:</strong> Click "Start Navigation" to simulate real-time movement to the destination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
