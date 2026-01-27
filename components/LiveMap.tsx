'use client';

import React, { useEffect, useState, useRef } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { interpolateLocation } from '@/lib/interpolation';
import { useMapsContext } from '@/components/MapsProvider';

interface Location {
  lat: number;
  lng: number;
}

interface LiveMapProps {
  pickup: Location & { address?: string };
  destination: Location & { address?: string };
  currentLocation: Location;
  route?: Array<{ lat: number; lng: number }>;
  driverName?: string;
}

const containerStyle = {
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
  driverName = 'Driver',
}: LiveMapProps) {
  const { isLoaded } = useMapsContext();

  const [animatedLocation, setAnimatedLocation] = useState<Location>(currentLocation);
  const [bearing, setBearing] = useState<number>(0);
  const [mapCenter, setMapCenter] = useState<Location>(currentLocation);
  const animationRef = useRef<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Calculate bearing between two points
  const calculateBearing = (start: Location, end: Location): number => {
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

  // Animate marker movement with LERP
  useEffect(() => {
    console.log('🔴 LIVEMAP: currentLocation prop updated', currentLocation);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const duration = 1000; // Reduced to 1 second to match real-time GPS frequency and minimize lag
    const startTime = Date.now();
    const startLocation = animatedLocation;
    const endLocation = currentLocation;

    // Calculate bearing for rotation
    const newBearing = calculateBearing(startLocation, endLocation);
    setBearing(newBearing);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-in-out function
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      const interpolated = interpolateLocation(startLocation, endLocation, easeProgress);
      setAnimatedLocation(interpolated);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentLocation]);

  // Auto-fit bounds when map loads or locations change
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(pickup);
    bounds.extend(destination);
    bounds.extend(animatedLocation);

    mapRef.current.fitBounds(bounds, {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50,
    });
  }, [pickup, destination, animatedLocation, isLoaded]);

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={14}
      options={mapOptions}
      onLoad={onMapLoad}
    >
      {/* Pickup Marker - Amber Circle with P */}
      {/* Pickup Marker - Store Icon */}
      <Marker
        position={pickup}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2"/>
              <path d="M10 12 H22 V20 H10 Z M12 12 V9 H20 V12" stroke="white" stroke-width="2" fill="none"/>
              <circle cx="16" cy="15" r="1.5" fill="white"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        }}
        zIndex={2}
      />

      {/* Destination Marker - Home Icon */}
      <Marker
        position={destination}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
              <path d="M16 8 L8 14 V22 H13 V18 H19 V22 H24 V14 Z" fill="white"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        }}
        zIndex={2}
      />

      {/* Driver Marker - Hyper-Realistic 3D Scooter with Logo Theme */}
      <Marker
        position={animatedLocation}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="68" height="68" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="crispShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="1" dy="3" stdDeviation="2.5" flood-color="rgba(0,0,0,0.5)"/>
                </filter>
                <linearGradient id="premiumAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFC107"/> <!-- Lighter Amber top -->
                  <stop offset="100%" stop-color="#F57C00"/> <!-- Deep Orange/Amber bottom -->
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
                
                <!-- 1. The Delivery Box (Rear) - The Brand Hero -->
                <rect x="24" y="44" width="20" height="15" rx="2" fill="url(#premiumAmber)" stroke="#B45309" stroke-width="1"/>
                <!-- Logo Simulation: A simplified white hand package box symbol -->
                <rect x="29" y="47" width="10" height="9" fill="white" rx="1" opacity="0.9"/>
                <path d="M31 49 L34 52 L37 49" stroke="#F59E0B" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/> <!-- Checkmark/Hand motif -->

                <!-- 2. Scooter Body & Chassis -->
                <path d="M28 22 L40 22 L42 46 L26 46 Z" fill="#333333"/> <!-- Floorboard -->
                
                <!-- Front Fairing (Nose) -->
                <path d="M26 14 Q34 10 42 14 L40 24 L28 24 Z" fill="url(#premiumAmber)" stroke="#B45309" stroke-width="0.5"/>
                <rect x="31" y="12" width="6" height="4" rx="1" fill="#FEF3C7"/> <!-- Headlight -->
                
                <!-- Side Mirrors -->
                <line x1="18" y1="18" x2="26" y2="20" stroke="#333" stroke-width="1.5"/>
                <circle cx="18" cy="18" r="2" fill="#111" stroke="#555" stroke-width="0.5"/>
                
                <line x1="50" y1="18" x2="42" y2="20" stroke="#333" stroke-width="1.5"/>
                <circle cx="50" cy="18" r="2" fill="#111" stroke="#555" stroke-width="0.5"/>

                <!-- Handlebars -->
                <path d="M18 20 L50 20" stroke="#111827" stroke-width="3" stroke-linecap="round"/>
                <circle cx="18" cy="20" r="2.5" fill="#000"/> <!-- Left Grip -->
                <circle cx="50" cy="20" r="2.5" fill="#000"/> <!-- Right Grip -->

                <!-- 3. The Rider -->
                <!-- Shoulders (Dark Company Jacket) -->
                <ellipse cx="34" cy="34" rx="10" ry="9" fill="#202124"/> 
                
                <!-- Helmet (Brand Color with shine) -->
                <circle cx="34" cy="34" r="7" fill="#F59E0B" stroke="#B45309" stroke-width="1"/>
                <circle cx="34" cy="34" r="7" fill="url(#helmetShine)"/> <!-- Glossy Shine -->
                <rect x="30" y="30" width="8" height="3" rx="1.5" fill="#111" opacity="0.8"/> <!-- Visor -->

                <!-- Arms (Reaching to handlebars) -->
                <path d="M26 34 Q22 30 20 20" stroke="#202124" stroke-width="3.5" stroke-linecap="round" fill="none"/>
                <path d="M42 34 Q46 30 48 20" stroke="#202124" stroke-width="3.5" stroke-linecap="round" fill="none"/>
              </g>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(68, 68),
          anchor: new google.maps.Point(34, 34),
        }}
        zIndex={3}
      />

      {/* Route Polyline - Premium Black */}
      {route && route.length > 0 && (
        <Polyline
          path={route}
          options={{
            strokeColor: '#000000', // Black route
            strokeOpacity: 0.8,
            strokeWeight: 4,
            geodesic: true,
          }}
        />
      )}
    </GoogleMap>
  );
}
