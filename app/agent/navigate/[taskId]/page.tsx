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
    libraries: ['places'] as any,
  });

  const [taskData, setTaskData] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<any>(null); // FIXED: Stable map center
  const [directions, setDirections] = useState<any>(null);
  const [distance, setDistance] = useState('');
  const [eta, setEta] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [useRealGPS, setUseRealGPS] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [pickupOTP, setPickupOTP] = useState(''); // NEW: For pickup verification
  const [isPickupVerified, setIsPickupVerified] = useState(false); // NEW: Track pickup verification
  const [deliveryOTP, setDeliveryOTP] = useState(''); // OTP exists but NOT shown to agent
  const [routePoints, setRoutePoints] = useState<Array<{lat: number, lng: number}>>([]);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const watchIdRef = React.useRef<number | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch task data and agent's current location
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await axios.get(`/api/task/${taskId}/live`);
        setTaskData(response.data);
        
        // FIXED: Get agent's CURRENT location via GPS instead of starting at pickup
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const agentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              console.log('📍 AGENT: Starting from current GPS location', agentLocation);
              setCurrentLocation(agentLocation);
              
              // Set map center ONCE on initial load
              if (!mapCenter) {
                setMapCenter(agentLocation);
              }
            },
            (error) => {
              // Fallback to pickup location if GPS fails
              console.warn('⚠️ GPS failed, using pickup location as fallback', error);
              const fallbackLocation = response.data.pickup;
              setCurrentLocation(fallbackLocation);
              if (!mapCenter) {
                setMapCenter(fallbackLocation);
              }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          // No geolocation support - use pickup as fallback
          const fallbackLocation = response.data.pickup;
          setCurrentLocation(fallbackLocation);
          if (!mapCenter) {
            setMapCenter(fallbackLocation);
          }
        }
        
        // Check if pickup already verified
        if (response.data.status === 'PICKED_UP' || response.data.status === 'ON_THE_WAY' || response.data.status === 'ARRIVING') {
          setIsPickupVerified(true);
        }
        
        // Store OTP for verification (but don't display to agent)
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

      // Extract route points for simulation
      const points: Array<{lat: number, lng: number}> = [];
      leg.steps.forEach((step: any) => {
        // Get lat/lng points from step
        if (step.lat_lngs && step.lat_lngs.length > 0) {
          step.lat_lngs.forEach((point: any) => {
            points.push({ lat: point.lat(), lng: point.lng() });
          });
        } else if (step.start_location && step.end_location) {
          // Fallback: use start and end of each step
          points.push({ 
            lat: step.start_location.lat(), 
            lng: step.start_location.lng() 
          });
        }
      });
      // Add final destination
      if (leg.end_location) {
        points.push({ 
          lat: leg.end_location.lat(), 
          lng: leg.end_location.lng() 
        });
      }
      console.log(`Route extracted: ${points.length} waypoints`);
      setRoutePoints(points);
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

  // Simulate movement (for testing without real GPS) - IMPROVED for smoother movement
  const startSimulation = () => {
    if (!taskData || !currentLocation) {
      alert('⚠️ Please wait for task data to load');
      return;
    }

    if (routePoints.length === 0) {
      alert('⚠️ Route not loaded yet, please wait');
      return;
    }

    setIsNavigating(true);
    setUseRealGPS(false);
    setCurrentRouteIndex(0);
    
    // IMPROVED: Slower, smoother movement
    intervalRef.current = setInterval(() => {
      setCurrentRouteIndex((prevIndex) => {
        if (prevIndex >= routePoints.length - 1) {
          stopNavigation();
          setShowCompleteModal(true);
          return prevIndex;
        }

        // CHANGED: Move 1 point at a time instead of skipping (smoother)
        const nextIndex = Math.min(prevIndex + 1, routePoints.length - 1);
        const newLocation = routePoints[nextIndex];

        setCurrentLocation(newLocation);

        // Send update to server - THROTTLED to every 5 updates for better performance
        if (nextIndex % 5 === 0) {
          axios.post('/api/driver/update', {
            taskId,
            driverId: taskData.driver?.id || 'agent_001',
            lat: newLocation.lat,
            lng: newLocation.lng,
            speed: 40,
            timestamp: Date.now(),
          }).then((response) => {
            if (response.data.data?.eta) {
              setEta(response.data.data.eta);
            }
          }).catch((error) => {
            console.error('Error updating location:', error);
          });
        }

        return nextIndex;
      });
    }, 800); // INCREASED from 1500ms to 800ms but with 1-point movement = smoother
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
    setCurrentRouteIndex(0);
  };

  // NEW: Verify pickup OTP
  const verifyPickupOTP = async () => {
    if (!pickupOTP || pickupOTP.length < 4) {
      alert('❌ Please enter the 4-digit OTP from customer');
      return;
    }

    if (pickupOTP !== deliveryOTP) {
      alert('❌ Incorrect OTP. Please ask the customer to tell you the correct OTP.');
      return;
    }

    try {
      // Update status to PICKED_UP
      const response = await axios.post('/api/driver/update', {
        taskId,
        driverId: taskData.driver?.id || 'agent_001',
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        speed: 0,
        timestamp: Date.now(),
      });

      setIsPickupVerified(true);
      alert('✅ Pickup verified! You can now start the journey to destination.');
    } catch (error) {
      console.error('Error verifying pickup:', error);
      alert('❌ Failed to verify pickup. Please try again.');
    }
  };

  // Complete delivery - NO OTP NEEDED (already verified at pickup)
  const handleCompleteDelivery = async () => {
    // No OTP check - customer already verified at pickup
    try {
      const response = await axios.post('/api/delivery/complete', {
        taskId,
        proofOfDelivery: {
          deliveredAt: new Date().toISOString(),
          recipientName: taskData.customer?.name || 'Customer',
          notes: 'Delivered successfully - Pickup was verified with OTP',
          photoUrl: 'data:image/png;base64,placeholder', // In production, capture actual photo
        },
      });

      if (response.data.success) {
        alert('✅ Delivery completed successfully!');
        window.location.href = '/agent';
      }
    } catch (error: any) {
      alert('❌ Failed to complete delivery');
      console.error('Delivery completion error:', error);
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
      {/* REMOVED: OTP Display Banner - Agent should NOT see OTP */}
      {/* OTP is for customer to tell agent verbally at pickup location */}

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

      {/* Map - FIXED: Stable center to prevent flickering */}
      <div className="flex-1 relative">
        {/* PICKUP OTP VERIFICATION OVERLAY - Shows when not verified */}
        {!isPickupVerified && (
          <div className="absolute top-4 left-0 right-0 mx-4 bg-white rounded-xl shadow-2xl p-5 z-50 border-4 border-blue-500 animate-pulse-slow">
            <h3 className="font-bold text-xl mb-2 text-gray-900">📍 Arrived at Pickup Location?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ask the customer to tell you the 4-digit OTP verbally, then enter it below to verify pickup.
            </p>
            <div className="flex space-x-2">
              <input
                type="text"
                maxLength={4}
                value={pickupOTP}
                onChange={(e) => setPickupOTP(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 4-digit OTP"
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-3xl font-bold tracking-widest focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={verifyPickupOTP}
                disabled={pickupOTP.length < 4}
                className={`bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors ${
                  pickupOTP.length < 4 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Verify
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              🔒 Customer has the OTP on their tracking screen
            </p>
          </div>
        )}

        <GoogleMap
          key={`map-${taskId}`}
          mapContainerStyle={mapContainerStyle}
          center={mapCenter || currentLocation}
          zoom={14}
          onLoad={(map) => { mapRef.current = map; }}
          options={{
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            disableDefaultUI: false,
            keyboardShortcuts: true,
            gestureHandling: 'greedy',
          }}
        >
          {/* Pickup Marker */}
          <Marker
            key={`pickup-${taskId}`}
            position={taskData.pickup}
            icon={{
              url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="#fbbf24" stroke="white" stroke-width="2"/>
                  <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">P</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 32),
            }}
            title="Pickup Location"
          />

          {/* Current Location - NO ANIMATION to prevent flicker */}
          {currentLocation && (
            <Marker
              key={`current-${currentLocation.lat}-${currentLocation.lng}`}
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
            key={`destination-${taskId}`}
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

          {/* Route - ONLY RENDER IF LOADED */}
          {directions && (
            <DirectionsRenderer
              key={`directions-${taskId}`}
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#10b981',
                  strokeWeight: 4,
                  strokeOpacity: 0.8,
                },
              }}
            />
          )}
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
            {!isPickupVerified && (
              <div className="bg-orange-100 border-2 border-orange-400 rounded-xl p-4 text-center">
                <p className="text-orange-800 font-bold">🔒 Verify pickup OTP first to start navigation</p>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={startRealGPS}
                disabled={!isPickupVerified || isNavigating}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  !isPickupVerified || isNavigating
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {!isPickupVerified ? '🔒 Real GPS' : '📍 Real GPS'}
              </button>
              <button
                onClick={startSimulation}
                disabled={!isPickupVerified || isNavigating}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  !isPickupVerified || isNavigating
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {!isPickupVerified ? '🔒 Simulate' : '🚀 Simulate'}
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

      {/* Complete Delivery Modal - PHOTO ONLY (No OTP at delivery) */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🎯 Arrived at Destination</h2>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded">
              <p className="text-sm text-green-800">
                <strong>✅ Pickup Verified:</strong> Customer OTP was confirmed at pickup location
              </p>
            </div>

            <div className="mb-4">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-8 border-2 border-dashed border-gray-400 text-center">
                <div className="text-5xl mb-3">📸</div>
                <p className="text-gray-600 font-semibold">Take Photo of Delivery</p>
                <p className="text-xs text-gray-500 mt-2">In production: Camera capture</p>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>📌 Location:</strong> {taskData.destination?.address || 'Destination'}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteDelivery}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
              >
                ✅ Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
