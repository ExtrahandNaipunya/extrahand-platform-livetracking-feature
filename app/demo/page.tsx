'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useMapsContext } from '@/components/MapsProvider';
import axios from 'axios';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

export default function DemoPage() {
  const { isLoaded } = useMapsContext();

  const [pickupLocation, setPickupLocation] = useState({ lat: 17.385044, lng: 78.486671 });
  const [deliveryLocation, setDeliveryLocation] = useState({ lat: 17.440826, lng: 78.348449 });
  const [driverLocation, setDriverLocation] = useState(pickupLocation);
  const [directions, setDirections] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(2); // seconds
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [taskId, setTaskId] = useState('');
  const mapRef = React.useRef<google.maps.Map | null>(null);

  // Initialize demo task
  const initializeDemoTask = async () => {
    const newTaskId = `demo_${Date.now()}`;
    setTaskId(newTaskId);

    try {
      await axios.post('/api/task/init', {
        taskId: newTaskId,
        pickup: { lat: pickupLocation.lat, lng: pickupLocation.lng },
        destination: { lat: deliveryLocation.lat, lng: deliveryLocation.lng },
        driver: {
          id: 'demo_driver',
          name: 'Demo Driver',
          phone: '+91-0000000000',
        },
      });

      // Initialize location
      await axios.post('/api/driver/update', {
        taskId: newTaskId,
        driverId: 'demo_driver',
        lat: pickupLocation.lat,
        lng: pickupLocation.lng,
        speed: 0,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error initializing demo:', error);
    }
  };

  // Calculate route
  const calculateRoute = useCallback(async () => {
    if (!window.google) return;

    const directionsService = new google.maps.DirectionsService();

    try {
      const result = await directionsService.route({
        origin: pickupLocation,
        destination: deliveryLocation,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      setDirections(result);
      
      const leg = result.routes[0].legs[0];
      setDistance(leg.distance?.text || '');
      setDuration(leg.duration?.text || '');
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  }, [pickupLocation, deliveryLocation]);

  useEffect(() => {
    if (isLoaded) {
      calculateRoute();
      initializeDemoTask();
    }
  }, [isLoaded, calculateRoute]);

  // Simulate movement
  const startSimulation = () => {
    setIsSimulating(true);
    setDriverLocation(pickupLocation);

    let step = 0;
    const totalSteps = 50;

    const interval = setInterval(async () => {
      step++;
      const progress = step / totalSteps;

      const newLat = pickupLocation.lat + (deliveryLocation.lat - pickupLocation.lat) * progress;
      const newLng = pickupLocation.lng + (deliveryLocation.lng - pickupLocation.lng) * progress;

      const newLocation = { lat: newLat, lng: newLng };
      setDriverLocation(newLocation);

      // Update via API
      if (taskId) {
        try {
          await axios.post('/api/driver/update', {
            taskId,
            driverId: 'demo_driver',
            lat: newLat,
            lng: newLng,
            speed: 40,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('Error updating location:', error);
        }
      }

      if (step >= totalSteps) {
        clearInterval(interval);
        setIsSimulating(false);
        alert('🎉 Simulation complete! Driver arrived at destination.');
      }
    }, simulationSpeed * 1000);
  };

  // Handle map click to set locations
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (window.confirm('Set this as pickup location? (Cancel for delivery location)')) {
      setPickupLocation({ lat, lng });
      setDriverLocation({ lat, lng });
    } else {
      setDeliveryLocation({ lat, lng });
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🧪 Demo Testing Module</h1>
            <p className="text-sm text-purple-100">Simulate real-time delivery tracking</p>
          </div>
          <div className="text-right">
            <p className="text-sm">Distance: <strong>{distance}</strong></p>
            <p className="text-sm">ETA: <strong>{duration}</strong></p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Controls Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-gray-800 mb-3">📍 Locations</h3>
              
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Pickup Location</p>
                  <p className="text-xs text-gray-600 font-mono">
                    {pickupLocation.lat.toFixed(6)}, {pickupLocation.lng.toFixed(6)}
                  </p>
                </div>

                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Delivery Location</p>
                  <p className="text-xs text-gray-600 font-mono">
                    {deliveryLocation.lat.toFixed(6)}, {deliveryLocation.lng.toFixed(6)}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Driver Current Position</p>
                  <p className="text-xs text-gray-600 font-mono">
                    {driverLocation.lat.toFixed(6)}, {driverLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-3">⚙️ Simulation Settings</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Speed (seconds per step)
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">{simulationSpeed}s per update</p>
                </div>

                <button
                  onClick={calculateRoute}
                  className="w-full bg-white border-2 border-purple-500 text-purple-600 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-colors text-sm"
                >
                  🔄 Recalculate Route
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-3">🚀 Controls</h3>
              
              <div className="space-y-2">
                <button
                  onClick={startSimulation}
                  disabled={isSimulating}
                  className={`w-full py-3 rounded-lg font-bold transition-all ${
                    isSimulating
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isSimulating ? '⏸️ Simulating...' : '▶️ Start Simulation'}
                </button>

                <button
                  onClick={() => {
                    setDriverLocation(pickupLocation);
                    setIsSimulating(false);
                  }}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                >
                  🔄 Reset
                </button>

                {taskId && (
                  <a
                    href={`/track/${taskId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors text-sm"
                  >
                    👁️ View Tracking Page
                  </a>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-xs">
              <p className="font-semibold text-yellow-800 mb-1">💡 How to use:</p>
              <ul className="text-yellow-700 space-y-1 list-disc list-inside">
                <li>Click map to set locations</li>
                <li>Adjust simulation speed</li>
                <li>Click "Start Simulation"</li>
                <li>Watch real-time updates</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={driverLocation}
            zoom={13}
            onLoad={(map) => { mapRef.current = map; }}
            onClick={handleMapClick}
          >
            {/* Pickup Marker */}
            <Marker
              position={pickupLocation}
              icon={{
                url: 'data:image/svg+xml;base64,' + btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="#10b981" stroke="white" stroke-width="2"/>
                    <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">P</text>
                  </svg>
                `),
                scaledSize: new google.maps.Size(32, 32),
              }}
              title="Pickup"
            />

            {/* Delivery Marker */}
            <Marker
              position={deliveryLocation}
              icon={{
                url: 'data:image/svg+xml;base64,' + btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 24 36">
                    <path d="M12 0C7.6 0 4 3.6 4 8c0 6.6 8 16 8 16s8-9.4 8-16c0-4.4-3.6-8-8-8z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
                    <circle cx="12" cy="8" r="3" fill="white"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(32, 48),
              }}
              title="Delivery"
            />

            {/* Driver Marker */}
            <Marker
              position={driverLocation}
              icon={{
                url: 'data:image/svg+xml;base64,' + btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="#0ea5e9" stroke="white" stroke-width="3"/>
                    <path d="M20 8 L26 32 L20 26 L14 32 Z" fill="white"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(40, 40),
              }}
              title="Driver"
            />

            {/* Route */}
            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
          </GoogleMap>
        </div>
      </div>
    </div>
  );
}
