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
  const [useRealGPS, setUseRealGPS] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [deliveryOTP, setDeliveryOTP] = useState('');
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const watchIdRef = React.useRef<number | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch task data
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await axios.get(`/api/task/${taskId}/live`);
        setTaskData(response.data);
        setCurrentLocation(response.data.pickup); // Start at pickup
        if (response.data.deliveryOTP) {
          setDeliveryOTP(response.data.deliveryOTP);
        }
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

  // Real GPS tracking
  const startRealGPS = () => {
    if (!navigator.geolocation) {
      alert('❌ Geolocation not supported by your browser');
      return;
    }

    setIsNavigating(true);
    setUseRealGPS(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, speed } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setCurrentLocation(newLocation);

        // Send update to server
        try {
          const response = await axios.post('/api/driver/update', {
            taskId,
            driverId: taskData.driver?.id || 'agent_001',
            lat: latitude,
            lng: longitude,
            speed: speed ? speed * 3.6 : 40, // Convert m/s to km/h
            timestamp: Date.now(),
          });

          // Update ETA
          if (response.data.data?.eta) {
            setEta(response.data.data.eta);
          }
        } catch (error) {
          console.error('Error updating location:', error);
        }

        // Check if arrived
        if (taskData) {
          const distanceToDestination = getDistance(newLocation, taskData.destination);
          if (distanceToDestination < 0.1) {
            stopNavigation();
            setShowCompleteModal(true);
          }
        }
      },
      (error) => {
        console.error('GPS error:', error);
        alert(`GPS Error: ${error.message}`);
        stopNavigation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Simulate movement (for testing without real GPS)
  const startSimulation = () => {
    setIsNavigating(true);
    setUseRealGPS(false);
    
    intervalRef.current = setInterval(async () => {
      if (!currentLocation || !taskData) return;

      // Move slightly towards destination
      const newLat = currentLocation.lat + (taskData.destination.lat - currentLocation.lat) * 0.05;
      const newLng = currentLocation.lng + (taskData.destination.lng - currentLocation.lng) * 0.05;

      const newLocation = { lat: newLat, lng: newLng };
      setCurrentLocation(newLocation);

      // Send update to server
      try {
        const response = await axios.post('/api/driver/update', {
          taskId,
          driverId: taskData.driver?.id || 'agent_001',
          lat: newLat,
          lng: newLng,
          speed: 40,
          timestamp: Date.now(),
        });

        // Update ETA
        if (response.data.data?.eta) {
          setEta(response.data.data.eta);
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }

      // Check if arrived
      const distanceToDestination = getDistance(newLocation, taskData.destination);
      if (distanceToDestination < 0.1) {
        stopNavigation();
        setShowCompleteModal(true);
      }
    }, 3000);
  };

  // Stop navigation
  const stopNavigation = () => {
    setIsNavigating(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Complete delivery
  const handleCompleteDelivery = async () => {
    if (!otpInput || otpInput.length !== 4) {
      alert('❌ Please enter 4-digit OTP');
      return;
    }

    try {
      const response = await axios.post('/api/delivery/complete', {
        taskId,
        otp: otpInput,
        proofOfDelivery: {
          photoUrl: 'captured_photo_url',
          signatureUrl: 'captured_signature_url',
          recipientName: taskData.customer?.name || 'Customer',
          notes: 'Delivered successfully',
        },
      });

      if (response.data.success) {
        alert('✅ Delivery completed successfully!');
        window.location.href = '/agent';
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        alert('❌ Invalid OTP. Please check and try again.');
      } else {
        alert('❌ Failed to complete delivery');
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopNavigation();
    };
  }, []);

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
    <div className="h-screen flex flex-col bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 shadow-lg">
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
          {currentLocation && (
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
          )}

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
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border-2 border-blue-300 shadow-sm">
              <p className="text-xs text-blue-700 font-semibold mb-1">DISTANCE</p>
              <p className="text-lg font-bold text-blue-600">{distance}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border-2 border-green-300 shadow-sm">
              <p className="text-xs text-green-700 font-semibold mb-1">ETA</p>
              <p className="text-lg font-bold text-green-600">{eta}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border-2 border-purple-300 shadow-sm">
              <p className="text-xs text-purple-700 font-semibold mb-1">STATUS</p>
              <p className="text-lg font-bold text-purple-600">
                {isNavigating ? '🚗 Moving' : '⏸️ Ready'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="flex space-x-3">
              <button
                onClick={startRealGPS}
                disabled={isNavigating}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  isNavigating
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                📍 Real GPS
              </button>
              <button
                onClick={startSimulation}
                disabled={isNavigating}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  isNavigating
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                }`}
              >
                🚀 Simulate
              </button>
            </div>
            {isNavigating && (
              <button
                onClick={stopNavigation}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
              >
                ⏸️ Stop Navigation
              </button>
            )}
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isNavigating}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-purple-700 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              ✅ Complete Delivery
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

      {/* Complete Delivery Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🎉 Complete Delivery</h2>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Enter OTP from Customer
              </label>
              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0000"
                className="w-full px-4 py-3 text-2xl text-center tracking-widest border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-bold"
              />
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded">
              <p className="text-sm text-yellow-800">
                <strong>📸 Note:</strong> In production, capture photo & signature here
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setOtpInput('');
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteDelivery}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
              >
                ✅ Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
