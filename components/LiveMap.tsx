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
      {/* Pickup Marker */}
      <Marker
        position={pickup}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        }}
        label={{
          text: 'P',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
        title="Pickup Location"
      />

      {/* Destination Marker */}
      <Marker
        position={destination}
        icon={{
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: 180,
        }}
        title="Destination"
      />

      {/* Driver Marker with Animation */}
      <Marker
        position={animatedLocation}
        icon={{
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#000000',
          strokeWeight: 2,
          rotation: bearing,
        }}
        label={{
          text: driverName ? driverName.charAt(0).toUpperCase() : 'D',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '16px',
        }}
        title={driverName}
      />

      {/* Route Polyline */}
      {route && route.length > 0 && (
        <Polyline
          path={route}
          options={{
            strokeColor: '#3b82f6',
            strokeOpacity: 0.8,
            strokeWeight: 5,
            geodesic: true,
          }}
        />
      )}
    </GoogleMap>
  );
}
