'use client';

import React, { useState, useRef } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface LocationNavbarProps {
  pickupLocation?: Location;
  dropLocation?: Location;
  onPickupChange: (location: Location) => void;
  onDropChange: (location: Location) => void;
  city?: string;
  onCityChange?: (city: string) => void;
}

const libraries: ("places" | "geometry" | "drawing")[] = ["places"];

export default function LocationNavbar({
  pickupLocation,
  dropLocation,
  onPickupChange,
  onDropChange,
  city = 'Hyderabad',
  onCityChange,
}: LocationNavbarProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries,
  });

  const [showCityModal, setShowCityModal] = useState(false);
  const pickupAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const dropAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const cities = [
    'Hyderabad',
    'Bangalore',
    'Mumbai',
    'Delhi',
    'Chennai',
    'Kolkata',
    'Pune',
  ];

  // Reverse geocode to get address
  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    if (!window.google) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      return result.results[0]?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Use current location for pickup
  const useCurrentLocationForPickup = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const address = await getAddressFromCoords(lat, lng);
          onPickupChange({ lat, lng, address });
        },
        (error) => {
          alert('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Use current location for drop
  const useCurrentLocationForDrop = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const address = await getAddressFromCoords(lat, lng);
          onDropChange({ lat, lng, address });
        },
        (error) => {
          alert('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Handle pickup autocomplete
  const onPickupPlaceChanged = () => {
    if (pickupAutocompleteRef.current) {
      const place = pickupAutocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || '';
        onPickupChange({ lat, lng, address });
      }
    }
  };

  // Handle drop autocomplete
  const onDropPlaceChanged = () => {
    if (dropAutocompleteRef.current) {
      const place = dropAutocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || '';
        onDropChange({ lat, lng, address });
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="bg-white shadow-md p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <nav className="bg-white text-black shadow-2xl sticky top-0 z-50 border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* City Selector */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-yellow-400">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 font-semibold">Delivering in:</span>
              <button
                onClick={() => setShowCityModal(true)}
                className="flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-1.5 rounded-lg transition-colors font-semibold"
              >
                <span className="font-semibold">{city}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="text-2xl font-bold flex items-center space-x-2">
              <span className="text-yellow-500">⚡</span>
              <span className="text-black">ExtraHand</span>
            </div>
          </div>

          {/* Location Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Pickup Location */}
            <div className="relative">
              <label className="block text-xs mb-1.5 text-gray-700 font-bold">📍 PICKUP LOCATION</label>
              <div className="flex space-x-2">
                <Autocomplete
                  onLoad={(autocomplete) => { pickupAutocompleteRef.current = autocomplete; }}
                  onPlaceChanged={onPickupPlaceChanged}
                  options={{
                    componentRestrictions: { country: 'in' },
                  }}
                >
                  <input
                    type="text"
                    placeholder="Enter pickup address..."
                    defaultValue={pickupLocation?.address}
                    className="flex-1 px-4 py-2.5 rounded-lg text-gray-800 border-2 border-yellow-400/20 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </Autocomplete>
                <button
                  onClick={useCurrentLocationForPickup}
                  className="px-4 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg transition-colors font-bold"
                  title="Use current location"
                >
                  📍
                </button>
              </div>
            </div>

            {/* Drop Location */}
            <div className="relative">
              <label className="block text-xs mb-1.5 text-gray-700 font-bold">🎯 DROP LOCATION</label>
              <div className="flex space-x-2">
                <Autocomplete
                  onLoad={(autocomplete) => { dropAutocompleteRef.current = autocomplete; }}
                  onPlaceChanged={onDropPlaceChanged}
                  options={{
                    componentRestrictions: { country: 'in' },
                  }}
                >
                  <input
                    type="text"
                    placeholder="Enter drop address..."
                    defaultValue={dropLocation?.address}
                    className="flex-1 px-4 py-2.5 rounded-lg text-gray-800 border-2 border-yellow-400/20 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </Autocomplete>
                <button
                  onClick={useCurrentLocationForDrop}
                  className="px-4 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg transition-colors font-bold"
                  title="Use current location"
                >
                  🎯
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* City Selection Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Select Your City</h3>
              <button
                onClick={() => setShowCityModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              {cities.map((cityName) => (
                <button
                  key={cityName}
                  onClick={() => {
                    if (onCityChange) onCityChange(cityName);
                    setShowCityModal(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    city === cityName
                      ? 'bg-yellow-400 text-black font-bold'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  {cityName}
                  {city === cityName && <span className="float-right">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
