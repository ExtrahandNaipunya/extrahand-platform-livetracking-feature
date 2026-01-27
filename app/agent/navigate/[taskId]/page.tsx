'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GoogleMap, Marker, Polyline, DirectionsRenderer } from '@react-google-maps/api';
import { useMapsContext } from '@/components/MapsProvider';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

export default function AgentNavigationPage() {
  const params = useParams();
  const taskId = params?.taskId as string;

  const { isLoaded } = useMapsContext();

  const [taskData, setTaskData] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<any>({ lat: 0, lng: 0 }); // FIXED: Initialize with default
  const [mapInitialized, setMapInitialized] = useState(false); // Track if map center is set
  const [directions, setDirections] = useState<any>(null);
  const [distance, setDistance] = useState('');

  const [eta, setEta] = useState('');
  const [pickupDistance, setPickupDistance] = useState(''); // NEW: Distance to pickup
  const [pickupEta, setPickupEta] = useState(''); // NEW: ETA to pickup
  const [isNavigating, setIsNavigating] = useState(false);
  const [useRealGPS, setUseRealGPS] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [pickupOTP, setPickupOTP] = useState(''); // NEW: For pickup verification
  const [isPickupVerified, setIsPickupVerified] = useState(false); // NEW: Track pickup verification
  const [deliveryOTP, setDeliveryOTP] = useState(''); // OTP exists but NOT shown to agent
  const [routePoints, setRoutePoints] = useState<Array<{ lat: number, lng: number }>>([]);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [bearing, setBearing] = useState(0); // NEW: Track bearing for rotation
  const [prevLocation, setPrevLocation] = useState<any>(null); // NEW: Track previous location
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const watchIdRef = React.useRef<number | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const socketRef = React.useRef<Socket | null>(null);

  // Initialize socket
  useEffect(() => {
    if (!taskId) return;

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('🟢 AGENT: Socket connected');
      socket.emit('subscribe', taskId);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [taskId]);

  // Calculate bearing between two points
  const calculateBearing = (start: any, end: any): number => {
    if (!start || !end) return 0;
    const startLat = (start.lat * Math.PI) / 180;
    const startLng = (start.lng * Math.PI) / 180;
    const endLat = (end.lat * Math.PI) / 180;
    const endLng = (end.lng * Math.PI) / 180;

    const dLng = endLng - startLng;
    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  // Update bearing when location changes
  useEffect(() => {
    if (prevLocation && currentLocation) {
      const newBearing = calculateBearing(prevLocation, currentLocation);
      // Only update bearing if moving significantly to avoid jitter
      if (newBearing !== 0) {
        setBearing(newBearing);
      }
    }
    setPrevLocation(currentLocation);
  }, [currentLocation]);

  // Fetch task data and agent's current location
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'active' | 'error' | 'idle'>('idle');

  // Fetch task data and agent's current location
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await axios.get(`/api/task/${taskId}/live`);
        setTaskData(response.data);

        // FIXED: Get agent's CURRENT location via GPS instead of starting at pickup
        if (navigator.geolocation) {
          setGpsStatus('locating');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const agentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              console.log('📍 AGENT: Starting from current GPS location', agentLocation);
              setCurrentLocation(agentLocation);
              setGpsStatus('active');

              // Set map center ONCE on initial load - LOCKED after first set
              if (!mapInitialized) {
                setMapCenter(agentLocation);
                setMapInitialized(true);
              }
            },
            (error) => {
              // Fallback to pickup location if GPS fails
              console.warn('⚠️ GPS failed, using pickup location as fallback', error);
              const fallbackLocation = response.data.pickup;
              setCurrentLocation(fallbackLocation);
              setGpsStatus('error');
              if (!mapInitialized) {
                setMapCenter(fallbackLocation);
                setMapInitialized(true);
              }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        } else {
          // No geolocation support - use pickup as fallback
          const fallbackLocation = response.data.pickup;
          setCurrentLocation(fallbackLocation);
          setGpsStatus('error');
          if (!mapInitialized) {
            setMapCenter(fallbackLocation);
            setMapInitialized(true);
          }
        }

        // CRITICAL FIX: Don't auto-verify pickup based on status!
        // OTP must be entered manually by agent at pickup location
        // Only set isPickupVerified to true if status is explicitly 'PICKED_UP' after OTP verification
        // or if already completed the pickup leg
        if (response.data.status === 'COMPLETED') {
          setIsPickupVerified(true);
        }
        // NOTE: For all other statuses (PENDING, ON_THE_WAY, ARRIVING), 
        // agent MUST verify OTP at pickup before proceeding

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

  // Calculate route - FIXED: Route should go through PICKUP first, then DESTINATION
  const calculateRoute = useCallback(async () => {
    if (!taskData || !currentLocation || !window.google) return;

    const directionsService = new google.maps.DirectionsService();

    try {
      // CRITICAL FIX: Add waypoint at PICKUP location before going to destination
      const waypoints = !isPickupVerified ? [
        {
          location: taskData.pickup,
          stopover: true // Must stop at pickup to verify OTP
        }
      ] : [];

      console.log('🗺️ AGENT: Calculating route', {
        from: currentLocation,
        to: taskData.destination,
        hasPickupWaypoint: !isPickupVerified,
        isPickupVerified
      });

      const result = await directionsService.route({
        origin: currentLocation,
        destination: taskData.destination,
        waypoints: waypoints, // Route through pickup FIRST if not verified
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false, // Don't optimize - maintain pickup order!
      });

      setDirections(result);

      setDirections(result);

      // Extract distance and duration
      const legs = result.routes[0].legs;

      if (!isPickupVerified && legs.length > 1) {
        // Pre-Pickup Mode: We have 2 legs (To Pickup, To Dest)
        const leg1 = legs[0]; // Current -> Pickup
        const leg2 = legs[1]; // Pickup -> Destination

        setPickupEta(leg1.duration?.text || '');
        setPickupDistance(leg1.distance?.text || '');

        // Calculate Total Trip (Current -> Pickup -> Dest)
        const totalDistMeters = (leg1.distance?.value || 0) + (leg2.distance?.value || 0);
        const totalDurSeconds = (leg1.duration?.value || 0) + (leg2.duration?.value || 0);

        setDistance((totalDistMeters / 1000).toFixed(1) + ' km');

        // Simple duration formatter
        const hrs = Math.floor(totalDurSeconds / 3600);
        const mins = Math.round((totalDurSeconds % 3600) / 60);
        setEta(hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} mins`);
      } else {
        // Post-Pickup Mode: Single leg to Destination
        const leg = legs[0];
        setDistance(leg.distance?.text || '');
        setEta(leg.duration?.text || '');
        setPickupEta('');
        setPickupDistance('');
      }

      // Extract route points for simulation from ALL legs
      const points: Array<{ lat: number, lng: number }> = [];
      result.routes[0].legs.forEach((leg: any) => {
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
        // Add end of each leg
        if (leg.end_location) {
          points.push({
            lat: leg.end_location.lat(),
            lng: leg.end_location.lng()
          });
        }
      });

      console.log(`🗺️ AGENT: Route calculated with ${points.length} waypoints, ${result.routes[0].legs.length} legs`, {
        hasPickupWaypoint: !isPickupVerified,
        pickup: taskData.pickup,
        destination: taskData.destination,
        startingFrom: currentLocation
      });
      setRoutePoints(points);
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  }, [taskData, currentLocation, isPickupVerified]);

  useEffect(() => {
    if (isLoaded && taskData && currentLocation) {
      calculateRoute();
    }
  }, [isLoaded, taskData, currentLocation, isPickupVerified, calculateRoute]); // Re-calculate when pickup verified

  // Refs to avoid stale closures in geolocation callbacks
  const isPickupVerifiedRef = React.useRef(isPickupVerified);
  const taskDataRef = React.useRef(taskData);

  // Keep refs in sync with state
  useEffect(() => {
    isPickupVerifiedRef.current = isPickupVerified;
  }, [isPickupVerified]);

  useEffect(() => {
    taskDataRef.current = taskData;
  }, [taskData]);

  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Real GPS tracking
  const startRealGPS = () => {
    if (!navigator.geolocation) {
      alert('❌ Geolocation not supported by your browser');
      setGpsStatus('error');
      return;
    }

    // Clear existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setIsNavigating(true);
    setUseRealGPS(true);
    setGpsStatus('locating');

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        setGpsStatus('active'); // GPS is working
        const { latitude, longitude, speed, accuracy } = position.coords; // Capture accuracy
        setGpsAccuracy(accuracy); // Update state

        const newLocation = { lat: latitude, lng: longitude };

        // USE REFS to get latest state inside callback
        const currentTaskData = taskDataRef.current;
        const currentIsPickupVerified = isPickupVerifiedRef.current;

        console.log('📡 Real GPS: Position update', {
          location: newLocation,
          isPickupVerified: currentIsPickupVerified,
          speed: speed ? (speed * 3.6).toFixed(1) + ' km/h' : 'N/A'
        });

        setCurrentLocation(newLocation);

        // Prepare Payload
        const payload = {
          taskId,
          driverId: currentTaskData?.driver?.id || 'agent_001',
          lat: latitude,
          lng: longitude,
          speed: speed ? speed * 3.6 : 40,
          status: !currentIsPickupVerified ? 'ASSIGNED' : 'ON_THE_WAY',
          timestamp: Date.now(),
        };

        // 1. Emit Socket Update IMMEDIATELY (Fastest UI update)
        if (socketRef.current) {
          socketRef.current.emit('update_location', payload);
          // console.log('📡 AGENT: Socket emitted location', payload.status);
        }

        // 2. Check Geofences (Arrival Logic)
        if (!currentIsPickupVerified && currentTaskData?.pickup) {
          const distanceToPickup = getDistance(newLocation, currentTaskData.pickup);

          // If within 50 meters of pickup, pause and show OTP prompt
          if (distanceToPickup < 0.05) {
            console.log('✅ Real GPS - Arrived at PICKUP location - Showing OTP verification');
            stopNavigation(); // Pause GPS tracking
            return;
          }
        }

        // 3. Check if arrived at DESTINATION (only if pickup verified)
        if (currentIsPickupVerified && currentTaskData?.destination) {
          const distanceToDestination = getDistance(newLocation, currentTaskData.destination);

          if (distanceToDestination < 0.1) {
            console.log('✅ Real GPS - Arrived at DESTINATION');
            stopNavigation();
            setShowCompleteModal(true);
            return;
          }
        }

        // 4. Send update to server (Persistence & Calculation)
        // This runs in background - UI update already happened via socket
        axios.post('/api/driver/update', payload)
          .then(response => {
            // Update ETA from server response if available (less time critical)
            if (response.data.data?.eta) {
              setEta(response.data.data.eta);
            }
          })
          .catch(error => {
            console.error('Error updating location persistence:', error);
          });
      },
      (error) => {
        console.error('GPS error:', error);
        setGpsStatus('error');
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

        // Check if arrived at PICKUP location (if not verified yet)
        if (!isPickupVerified && taskData.pickup) {
          const distanceToPickup = getDistance(newLocation, taskData.pickup);
          console.log(`📍 Distance to pickup: ${distanceToPickup.toFixed(3)} km`);

          // If within 50 meters of pickup, pause and show OTP prompt
          if (distanceToPickup < 0.05) {
            console.log('✅ Arrived at PICKUP location - Showing OTP verification');
            stopNavigation(); // Pause simulation
            // OTP overlay will automatically show because isPickupVerified is false
            return prevIndex; // Stop moving
          }
        }

        // Check if arrived at DESTINATION (only if pickup verified)
        if (isPickupVerified && taskData.destination) {
          const distanceToDestination = getDistance(newLocation, taskData.destination);
          if (distanceToDestination < 0.05) {
            stopNavigation();
            setShowCompleteModal(true);
            return prevIndex;
          }
        }

        // Send update to server - IMPROVED: Every 2 updates for better real-time experience
        if (nextIndex % 2 === 0) {
          axios.post('/api/driver/update', {
            taskId,
            driverId: taskData.driver?.id || 'agent_001',
            lat: newLocation.lat,
            lng: newLocation.lng,
            status: !isPickupVerified ? 'ASSIGNED' : 'ON_THE_WAY', // Explicitly send status
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
    }, 500); // IMPROVED: 500ms with 1-point movement = smoother and faster updates
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
      // ✅ CRITICAL FIX: Update currentLocation to pickup location BEFORE verifying
      // This ensures the next route calculation starts from pickup, not old agent location
      setCurrentLocation(taskData.pickup);
      console.log('✅ PICKUP VERIFIED: Updated agent location to pickup', taskData.pickup);

      // Update status to PICKED_UP
      const response = await axios.post('/api/driver/update', {
        taskId,
        driverId: taskData.driver?.id || 'agent_001',
        lat: taskData.pickup.lat, // Use pickup location
        lng: taskData.pickup.lng, // Use pickup location
        status: 'PICKED_UP', // ✅ Explicitly update status
        speed: 0,
        timestamp: Date.now(),
      });

      setIsPickupVerified(true);

      // ✅ CRITICAL FIX: Reset route index so simulation starts from pickup
      setCurrentRouteIndex(0);

      alert('✅ Pickup verified! You can now proceed to the destination.');

      // If Real GPS, automatically restart tracking
      if (useRealGPS) {
        console.log('📍 Real GPS: Restarting GPS tracking from pickup location');
        setTimeout(() => {
          startRealGPS();
        }, 1000);
      } else {
        console.log('🎮 Simulation: User must click Start Simulation to continue to destination');
      }
      // If simulation, user needs to click Start again to continue to destination

      // Route will automatically recalculate via useEffect when isPickupVerified changes
      // Now it will calculate from pickup (current location) to destination
    } catch (error) {
      console.error('Error verifying pickup:', error);
      alert('❌ Failed to verify pickup. Please try again.');
    }
  };

  // Complete delivery - NO OTP NEEDED (already verified at pickup)
  const handleCompleteDelivery = async () => {
    // No OTP check - customer already verified at pickup
    try {
      console.log('🔵 Completing delivery for taskId:', taskId);
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
        console.log('✅ Delivery completed successfully');
        alert('✅ Delivery completed successfully!');
        window.location.href = '/agent';
      }
    } catch (error: any) {
      console.error('❌ Delivery completion error:', error.response?.status, error.response?.data);
      // Only show alert if not already shown
      if (!error.response?.data?.alertShown) {
        const errorMsg = error.response?.status === 404
          ? '❌ Delivery endpoint not found. Please restart the server.'
          : '❌ Failed to complete delivery. Please try again.';
        alert(errorMsg);
        error.response.data = { ...error.response?.data, alertShown: true };
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading navigation...</p>
        </div>
      </div>
    );
  }

  // ✅ FIXED: Show completed screen if delivery is already done
  if (taskData.status === 'COMPLETED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-4 border-yellow-400 text-center">
          <div className="text-6xl mb-4 animate-bounce">✅</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Delivery Completed!</h2>
          <p className="text-gray-600 mb-6">You have successfully delivered this package</p>

          <div className="bg-yellow-50 rounded-lg p-4 mb-6 border-2 border-yellow-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-semibold">#{taskId?.slice(-8)}</span>
            </div>
            {taskData.completedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Completed at:</span>
                <span className="font-semibold">
                  {new Date(taskData.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => window.location.href = '/agent'}
            className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-bold transition-colors shadow-lg hover:shadow-xl"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Modern Header with Gradient */}
      {/* Modern Header with Gradient */}
      <header className="bg-yellow-400 text-black shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Active Delivery</h1>
                <p className="text-gray-900 text-sm font-medium">
                  {taskData.item || 'Package'} • Order #{taskId?.slice(-8)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-3xl font-bold">{eta || 'Calculating...'}</p>
                <p className="text-gray-900 text-sm">{distance || '--'} away</p>
              </div>
              {!isPickupVerified && (
                <div className="bg-black text-white px-4 py-2 rounded-xl font-bold text-sm animate-pulse">
                  🔒 Pickup OTP Required
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Map (70%) */}
        <div className="flex-1 relative">
          <GoogleMap
            key={`map-${taskId}`}
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
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
              disableDoubleClickZoom: false,
              draggable: true,
              scrollwheel: true,
              panControl: false,
            }}
          >
            {/* Pickup Marker - Store Icon */}
            <Marker
              key={`pickup-${taskId}`}
              position={taskData.pickup}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2"/>
                    <path d="M12 14 H28 V26 H12 Z M14 14 V10 H26 V14" stroke="white" stroke-width="2" fill="none"/>
                    <circle cx="20" cy="18" r="2" fill="white"/>
                  </svg>
                `)}`,
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20),
              }}
              title="Pickup Location"
              zIndex={2}
            />

            {/* Current Location (Agent) - Realistic 3D Scooter */}
            {currentLocation && (
              <Marker
                key={`agent-marker-${taskId}`}
                position={currentLocation}
                icon={{
                  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                    <svg width="68" height="68" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <filter id="crispShadow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="1" dy="3" stdDeviation="2.5" flood-color="rgba(0,0,0,0.5)"/>
                        </filter>
                        <linearGradient id="premiumAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#FFC107"/> 
                          <stop offset="100%" stop-color="#F57C00"/> 
                        </linearGradient>
                        <linearGradient id="metalGrey" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#4B5563"/>
                          <stop offset="100%" stop-color="#1F2937"/>
                        </linearGradient>
                        <radialGradient id="helmetShine" cx="30%" cy="30%" r="50%">
                          <stop offset="0%" stop-color="#FFF9C4" stop-opacity="0.8"/>
                          <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
                        </radialGradient>
                      </defs>
                      
                      <g transform="rotate(${bearing} 34 34)" filter="url(#crispShadow)">
                        <!-- Box -->
                        <rect x="24" y="44" width="20" height="15" rx="2" fill="url(#premiumAmber)" stroke="#B45309" stroke-width="1"/>
                        <rect x="29" y="47" width="10" height="9" fill="white" rx="1" opacity="0.9"/> <!-- Logo -->
                        
                        <!-- Body -->
                        <path d="M28 22 L40 22 L42 46 L26 46 Z" fill="#333333"/>
                        <path d="M26 14 Q34 10 42 14 L40 24 L28 24 Z" fill="url(#premiumAmber)" stroke="#B45309" stroke-width="0.5"/>
                        <rect x="31" y="12" width="6" height="4" rx="1" fill="#FEF3C7"/> <!-- Headlight -->
                        
                        <!-- Handlebars -->
                        <path d="M18 20 L50 20" stroke="#111827" stroke-width="3" stroke-linecap="round"/>
                        <circle cx="18" cy="20" r="2.5" fill="#000"/>
                        <circle cx="50" cy="20" r="2.5" fill="#000"/>

                        <!-- Rider -->
                        <ellipse cx="34" cy="34" rx="10" ry="9" fill="#202124"/> 
                        <circle cx="34" cy="34" r="7" fill="url(#helmetShine)" stroke="#B45309" stroke-width="1"/>

                        <!-- Arms -->
                        <path d="M26 34 Q22 30 20 20" stroke="#202124" stroke-width="3.5" stroke-linecap="round" fill="none"/>
                        <path d="M42 34 Q46 30 48 20" stroke="#202124" stroke-width="3.5" stroke-linecap="round" fill="none"/>
                      </g>
                    </svg>
                  `)}`,
                  scaledSize: new google.maps.Size(68, 68),
                  anchor: new google.maps.Point(34, 34),
                }}
                title="You are here"
                zIndex={3}
              />
            )}

            {/* Destination Marker - Home Icon */}
            <Marker
              key={`destination-${taskId}`}
              position={taskData.destination}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
                    <path d="M20 10 L10 18 V28 H16 V22 H24 V28 H30 V18 Z" fill="white"/>
                  </svg>
                `)}`,
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20),
              }}
              title="Destination"
              zIndex={2}
            />

            {/* Route - ONLY RENDER IF LOADED */}
            {directions && (
              <DirectionsRenderer
                key={`directions-${taskId}`}
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#000000',
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                  },
                }}
              />
            )}
          </GoogleMap>
        </div>

        {/* Right Side Panel - Controls & Info (30%) */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shadow-2xl">
          {/* OTP Verification Section - Prominent when needed */}
          {/* OTP Verification Section */}
          {!isPickupVerified && (
            <div className="bg-black p-6 text-white">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-white/20 p-3 rounded-xl animate-pulse">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">Pickup Verification Required</h3>
                  <p className="text-gray-300 text-sm">Enter OTP from customer</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-3">
                <p className="text-sm mb-3 text-gray-300">
                  📱 Ask the customer to tell you their 4-digit OTP verbally
                </p>
                <input
                  type="text"
                  maxLength={4}
                  value={pickupOTP}
                  onChange={(e) => setPickupOTP(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 0 0 0"
                  className="w-full px-4 py-4 border-2 border-white/30 bg-white/20 backdrop-blur-sm rounded-xl text-center text-4xl font-bold tracking-[0.5em] text-white placeholder-white/40 focus:border-white focus:bg-white/30 focus:outline-none transition-all"
                />
              </div>

              <button
                onClick={verifyPickupOTP}
                disabled={pickupOTP.length < 4}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${pickupOTP.length < 4
                  ? 'bg-white/20 text-white/50 cursor-not-allowed'
                  : 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                  }`}
              >
                {pickupOTP.length < 4 ? '🔒 Enter 4 digits' : '✅ Verify & Continue'}
              </button>

              <p className="text-xs text-gray-400 mt-3 text-center">
                Customer sees this OTP on their tracking screen
              </p>
            </div>
          )}




          {/* GPS Status & Controls */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-800">Navigation Mode</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${gpsStatus === 'active' ? 'bg-green-100 text-green-700' :
                gpsStatus === 'error' ? 'bg-red-100 text-red-700' :
                  gpsStatus === 'locating' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                    'bg-gray-200 text-gray-600'
                }`}>
                {gpsStatus === 'active' ? '🟢 GPS Active' :
                  gpsStatus === 'error' ? '🔴 GPS Failed' :
                    gpsStatus === 'locating' ? '🔵 Locating...' : '⚪ Idle'}
              </span>
            </div>

            {/* GPS Accuracy Indicator */}
            {gpsAccuracy !== null && useRealGPS && (
              <div className={`mb-2 text-xs flex items-center justify-between px-2 py-1 rounded ${gpsAccuracy > 100 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                }`}>
                <span className="font-semibold">GPS Accuracy:</span>
                <span className="font-bold">{Math.round(gpsAccuracy)} meters</span>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={startRealGPS}
                disabled={isNavigating && useRealGPS}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center space-x-1 transition-all ${isNavigating && useRealGPS
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                  }`}
              >
                <span>🛰️</span>
                <span>Real GPS</span>
              </button>

              <button
                onClick={startSimulation}
                disabled={isNavigating && !useRealGPS}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center space-x-1 transition-all ${isNavigating && !useRealGPS
                  ? 'bg-purple-600 text-white shadow-inner'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-500 hover:text-purple-600'
                  }`}
              >
                <span>🎮</span>
                <span>Simulate</span>
              </button>
            </div>

            {gpsStatus === 'error' && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 flex items-center justify-between">
                <span>⚠️ Using Fallback Location (Pickup)</span>
                <button
                  onClick={startRealGPS}
                  className="underline font-bold hover:text-red-800"
                >
                  Retry
                </button>
              </div>
            )}

            {isNavigating && (
              <button
                onClick={stopNavigation}
                className="w-full mt-2 bg-red-100 text-red-600 hover:bg-red-200 py-1.5 rounded-lg text-sm font-bold transition-colors"
              >
                🛑 Stop Navigation
              </button>
            )}
          </div>
          {!isPickupVerified && pickupEta && (
            <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-400 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                STEP 1: PICKUP
              </div>
              <div className="flex items-center justify-between mt-1">
                <div>
                  <p className="text-xs text-yellow-800 font-bold mb-0.5">TO PICKUP LOCATION</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold text-yellow-900">{pickupEta}</p>
                    <p className="text-sm font-semibold text-yellow-700">({pickupDistance})</p>
                  </div>
                </div>
                <div className="bg-yellow-200 p-2 rounded-full">
                  <svg className="w-5 h-5 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* 2. TOTAL / DESTINATION CARD */}
          <div className={`rounded-xl p-4 border-2 ${!isPickupVerified ? 'bg-gray-50 border-gray-300' : 'bg-green-50 border-green-400'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-700 font-bold mb-0.5">
                  {!isPickupVerified ? 'TOTAL TRIP (To Drop)' : 'TO DESTINATION'}
                </p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold text-gray-900">{eta || '--'}</p>
                  <p className="text-sm font-semibold text-gray-600">({distance || '--'})</p>
                </div>
              </div>
              <div className="bg-white p-2 rounded-full border">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-4 border-2 ${isNavigating
            ? 'bg-black text-white border-gray-800'
            : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold mb-1 ${isNavigating ? 'text-gray-300' : 'text-gray-500'
                  }`}>STATUS</p>
                <p className={`text-2xl font-bold ${isNavigating ? 'text-white' : 'text-gray-700'
                  }`}>
                  {isNavigating ? '🚗 Navigating' : '⏸️ Paused'}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${isNavigating ? 'bg-gray-800' : 'bg-gray-200'
                }`}>
                <svg className={`w-6 h-6 ${isNavigating ? 'text-yellow-400 animate-pulse' : 'text-gray-500'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>


          {/* Navigation Controls */}
          <div className="p-4 space-y-3">
            <div className="flex space-x-3">
              <button
                onClick={startRealGPS}
                disabled={isNavigating}
                className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all shadow-lg ${isNavigating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-black text-white hover:bg-gray-800 hover:shadow-xl transform hover:scale-[1.02]'
                  }`}
              >
                <div className="flex flex-col items-center">
                  <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Real GPS
                </div>
              </button>
              <button
                onClick={startSimulation}
                disabled={isNavigating}
                className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all shadow-lg ${isNavigating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-yellow-400 text-black hover:bg-yellow-500 hover:shadow-xl transform hover:scale-[1.02]'
                  }`}
              >
                <div className="flex flex-col items-center">
                  <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  Simulate
                </div>
              </button>
            </div>

            {isNavigating && (
              <button
                onClick={stopNavigation}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Stop Navigation</span>
                </div>
              </button>
            )}

            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isNavigating}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-purple-700 shadow-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none transition-all hover:shadow-xl transform hover:scale-[1.02]"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Complete Delivery</span>
              </div>
            </button>
          </div>

          {/* Customer Info Card */}
          {taskData.customer && (
            <div className="mx-4 mb-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
              <div className="flex items-start space-x-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-amber-700 font-semibold mb-1">CUSTOMER DETAILS</p>
                  <p className="text-sm font-bold text-amber-900">{taskData.customer.name}</p>
                  <p className="text-sm text-amber-700">{taskData.customer.phone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Route Info */}
          <div className="mx-4 mb-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border-2 border-indigo-200">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-indigo-600 font-semibold">PICKUP</p>
                  <p className="text-sm text-indigo-900 font-medium">{taskData.pickup?.address || 'Pickup Location'}</p>
                </div>
              </div>
              <div className="ml-5 border-l-2 border-indigo-200 h-6"></div>
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-indigo-600 font-semibold">DESTINATION</p>
                  <p className="text-sm text-indigo-900 font-medium">{taskData.destination?.address || 'Destination'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Delivery Modal - Enhanced Design */}
      {
        showCompleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 transform transition-all">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Arrived at Destination</h2>
                <p className="text-gray-600">Complete the delivery process</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-green-900">Pickup Verified</p>
                    <p className="text-xs text-green-700">Customer OTP confirmed at pickup location</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Proof of Delivery</label>
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-8 border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-700 font-semibold mb-1">Take Photo of Package</p>
                  <p className="text-xs text-gray-500">Production: Camera capture will activate</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900 mb-1">DELIVERY LOCATION</p>
                    <p className="text-sm text-blue-700">{taskData.destination?.address || 'Destination Address'}</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteDelivery}
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Confirm Delivery</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
