'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { Location } from '@/types';
import { interpolateLocation, calculateBearing } from '@/lib/interpolation';

interface LiveMapProps {
  pickup: Location;
  destination: Location;
  currentLocation: Location;
  route?: Array<{ lat: number; lng: number }>;
  driverName?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export default function LiveMap({ 
  pickup, 
  destination, 
  currentLocation,
  route,
  driverName 
}: LiveMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: ['places'] as any,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [animatedLocation, setAnimatedLocation] = useState(currentLocation);
  const [bearing, setBearing] = useState(0);
  const animationRef = useRef<number | null>(null);
  const previousLocationRef = useRef(currentLocation);
  const [showTraffic, setShowTraffic] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  // Smooth marker animation with throttling
  useEffect(() => {
    // Skip animation if location hasn't changed significantly
    const distanceThreshold = 0.00001; // ~1 meter
    const latDiff = Math.abs(currentLocation.lat - previousLocationRef.current.lat);
    const lngDiff = Math.abs(currentLocation.lng - previousLocationRef.current.lng);
    
    if (latDiff < distanceThreshold && lngDiff < distanceThreshold) {
      return;
    }

    const duration = 1000; // 1 second animation
    const startTime = Date.now();
    const startLocation = animatedLocation;
    const endLocation = currentLocation;

    // Calculate bearing for rotation
    const newBearing = calculateBearing(startLocation, endLocation);
    if (!isNaN(newBearing)) {
      setBearing(newBearing);
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      const interpolated = interpolateLocation(startLocation, endLocation, easeProgress);
      setAnimatedLocation(interpolated);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(animate);
    previousLocationRef.current = currentLocation;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentLocation]);

  // Auto-center map intelligently (only once on load)
  const centerMap = useCallback(() => {
    if (!mapRef.current || !pickup || !destination) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(pickup);
    bounds.extend(destination);
    bounds.extend(animatedLocation);

    mapRef.current.fitBounds(bounds, 80);
  }, [pickup, destination, animatedLocation]);

  // Only recenter on initial load
  const hasCenteredRef = useRef(false);
  useEffect(() => {
    if (!hasCenteredRef.current && pickup && destination) {
      const timer = setTimeout(() => {
        centerMap();
        hasCenteredRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pickup, destination]); // Only on initial load

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // Initialize traffic layer
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
    }
    
    centerMap();
  }, [centerMap]);

  // Toggle traffic layer
  const toggleTraffic = () => {
    if (!trafficLayerRef.current || !mapRef.current) return;
    
    if (showTraffic) {
      trafficLayerRef.current.setMap(null);
    } else {
      trafficLayerRef.current.setMap(mapRef.current);
    }
    setShowTraffic(!showTraffic);
  };

  // Toggle map type
  const toggleMapType = () => {
    const newType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(newType);
    if (mapRef.current) {
      mapRef.current.setMapTypeId(newType);
    }
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-red-600">Error loading maps</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="animate-pulse text-gray-600">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={animatedLocation}
        zoom={14}
        onLoad={onLoad}
        options={{
          ...mapOptions,
          mapTypeId: mapType,
        }}
      >
      {/* Pickup Marker */}
      <Marker
        position={pickup}
        icon={{
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="#fbbf24" stroke="#000000" stroke-width="2"/>
              <text x="12" y="16" text-anchor="middle" fill="#000000" font-size="12" font-weight="bold">P</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        }}
        title="Pickup Location"
      />

      {/* Destination Marker */}
      <Marker
        position={destination}
        icon={{
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="56" viewBox="0 0 24 36">
              <path d="M12 0C7.6 0 4 3.6 4 8c0 6.6 8 16 8 16s8-9.4 8-16c0-4.4-3.6-8-8-8z" fill="#fbbf24" stroke="#000000" stroke-width="2"/>
              <circle cx="12" cy="8" r="3" fill="#000000"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 56),
          anchor: new google.maps.Point(20, 56),
        }}
        title="Destination"
      />

      {/* Driver Marker with rotation and custom icon */}
      <Marker
        position={animatedLocation}
        icon={{
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
              <defs>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                </filter>
              </defs>
              <g filter="url(#shadow)" transform="rotate(${bearing} 28 28)">
                <!-- Outer circle with pulse -->
                <circle cx="28" cy="28" r="26" fill="#fbbf24" opacity="0.2">
                  <animate attributeName="r" values="20;26;20" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/>
                </circle>
                <!-- Main circle -->
                <circle cx="28" cy="28" r="20" fill="#000000" stroke="#fbbf24" stroke-width="3"/>
                <!-- Direction arrow -->
                <path d="M28 10 L34 34 L28 28 L22 34 Z" fill="#fbbf24" stroke="#000000" stroke-width="1"/>
                <!-- Driver initial -->
                <text x="28" y="36" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="bold">${driverName ? driverName.charAt(0).toUpperCase() : 'D'}</text>
              </g>
            </svg>
          `),
          scaledSize: new google.maps.Size(56, 56),
          anchor: new google.maps.Point(28, 28),
        }}
        title={driverName || 'Driver'}
        zIndex={1000}
        onClick={() => {
          if (mapRef.current) {
            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; font-family: sans-serif;">
                  <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">
                    🚗 ${driverName || 'Driver'}
                  </div>
                  <div style="font-size: 12px; color: #666;">
                    Current Location
                  </div>
                  <div style="font-size: 11px; color: #999; margin-top: 4px;">
                    ${animatedLocation.lat.toFixed(6)}, ${animatedLocation.lng.toFixed(6)}
                  </div>
                </div>
              `,
            });
            infoWindow.setPosition(animatedLocation);
            infoWindow.open(mapRef.current);
          }
        }}
      />

      {/* Route Polyline */}
      {route && route.length > 0 && (
        <Polyline
          path={route}
          options={{
            strokeColor: '#fbbf24',
            strokeOpacity: 1,
            strokeWeight: 5,
            geodesic: true,
          }}
        />
      )}
      </GoogleMap>

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
        {/* Recenter Button */}
        <button
          onClick={centerMap}
          className="bg-white hover:bg-gray-50 text-black p-3 rounded-full shadow-lg border-2 border-yellow-400 transition-all hover:scale-110"
          title="Recenter map"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Traffic Toggle */}
        <button
          onClick={toggleTraffic}
          className={`p-3 rounded-full shadow-lg border-2 transition-all hover:scale-110 ${
            showTraffic
              ? 'bg-yellow-400 border-black text-black'
              : 'bg-white border-yellow-400 text-black hover:bg-gray-50'
          }`}
          title="Toggle traffic layer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>

        {/* Map Type Toggle */}
        <button
          onClick={toggleMapType}
          className="bg-white hover:bg-gray-50 text-black p-3 rounded-full shadow-lg border-2 border-yellow-400 transition-all hover:scale-110"
          title={mapType === 'roadmap' ? 'Switch to satellite' : 'Switch to roadmap'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border-2 border-yellow-400 z-10">
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-black"></div>
            <span className="font-semibold text-gray-700">Pickup</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-black rounded-full border-2 border-yellow-400"></div>
            <span className="font-semibold text-gray-700">Driver</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C7.6 0 4 3.6 4 8c0 6.6 8 16 8 16s8-9.4 8-16c0-4.4-3.6-8-8-8z"/>
            </svg>
            <span className="font-semibold text-gray-700">Drop</span>
          </div>
        </div>
      </div>
    </div>
  );
}
