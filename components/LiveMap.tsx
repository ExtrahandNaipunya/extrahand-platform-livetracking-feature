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

  // Smooth marker animation
  useEffect(() => {
    const duration = 1000; // 1 second animation
    const startTime = Date.now();
    const startLocation = animatedLocation;
    const endLocation = currentLocation;

    // Calculate bearing for rotation
    const newBearing = calculateBearing(startLocation, endLocation);
    setBearing(newBearing);

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

  // Auto-center map intelligently
  const centerMap = useCallback(() => {
    if (!mapRef.current) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(pickup);
    bounds.extend(destination);
    bounds.extend(animatedLocation);

    mapRef.current.fitBounds(bounds, 50);
  }, [pickup, destination, animatedLocation]);

  useEffect(() => {
    centerMap();
  }, [centerMap]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    centerMap();
  }, [centerMap]);

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
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={animatedLocation}
      zoom={14}
      onLoad={onLoad}
      options={mapOptions}
    >
      {/* Pickup Marker */}
      <Marker
        position={pickup}
        icon={{
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="#10b981" stroke="white" stroke-width="2"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">P</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        }}
        title="Pickup Location"
      />

      {/* Destination Marker */}
      <Marker
        position={destination}
        icon={{
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 24 36">
              <path d="M12 0C7.6 0 4 3.6 4 8c0 6.6 8 16 8 16s8-9.4 8-16c0-4.4-3.6-8-8-8z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
              <circle cx="12" cy="8" r="3" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 48),
          anchor: new google.maps.Point(16, 48),
        }}
        title="Destination"
      />

      {/* Driver Marker with rotation */}
      <Marker
        position={animatedLocation}
        icon={{
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <g transform="rotate(${bearing} 20 20)">
                <circle cx="20" cy="20" r="18" fill="#0ea5e9" stroke="white" stroke-width="3"/>
                <path d="M20 8 L26 32 L20 26 L14 32 Z" fill="white"/>
              </g>
              <circle cx="20" cy="20" r="6" fill="white" opacity="0.3" class="pulse"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        }}
        title={driverName || 'Driver'}
        zIndex={1000}
      />

      {/* Route Polyline */}
      {route && route.length > 0 && (
        <Polyline
          path={route}
          options={{
            strokeColor: '#0ea5e9',
            strokeOpacity: 0.8,
            strokeWeight: 4,
            geodesic: true,
          }}
        />
      )}
    </GoogleMap>
  );
}
