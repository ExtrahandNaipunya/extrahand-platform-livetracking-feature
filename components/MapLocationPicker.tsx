'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { useMapsContext } from '@/components/MapsProvider';
import SavedAddressesDropdown from '@/components/SavedAddressesDropdown';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface MapLocationPickerProps {
  initialLocation?: Location;
  onLocationSelect: (location: Location) => void;
  label?: string;
  markerColor?: string;
  showSearch?: boolean;
  mode?: 'pickup' | 'drop';
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

export default function MapLocationPicker({
  initialLocation = { lat: 17.385044, lng: 78.486671, address: 'Hyderabad' },
  onLocationSelect,
  label = 'Select Location',
  markerColor = '#3b82f6',
  showSearch = true,
  mode = 'pickup',
}: MapLocationPickerProps) {
  const { isLoaded } = useMapsContext();

  // Ensure initialLocation has valid numbers
  const validInitialLocation = {
    lat: typeof initialLocation?.lat === 'number' ? initialLocation.lat : 17.385044,
    lng: typeof initialLocation?.lng === 'number' ? initialLocation.lng : 78.486671,
    address: initialLocation?.address || 'Hyderabad',
  };

  const [selectedLocation, setSelectedLocation] = useState<Location>(validInitialLocation);
  const [mapCenter, setMapCenter] = useState(validInitialLocation);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchValue, setSearchValue] = useState(validInitialLocation.address || '');
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Update when initialLocation changes from parent
  useEffect(() => {
    if (initialLocation && 
        typeof initialLocation.lat === 'number' && 
        typeof initialLocation.lng === 'number') {
      const validLoc = {
        lat: initialLocation.lat,
        lng: initialLocation.lng,
        address: initialLocation.address || '',
      };
      setSelectedLocation(validLoc);
      setMapCenter(validLoc);
      setSearchValue(validLoc.address || '');
    }
  }, [initialLocation]);

  // Reverse geocode to get address from coordinates
  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    if (!window.google) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      
      if (result.results[0]) {
        return result.results[0].formatted_address;
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Handle map click
  const onMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const address = await getAddressFromCoords(lat, lng);
      
      const newLocation = { lat, lng, address };
      setSelectedLocation(newLocation);
      setSearchValue(address); // ✅ Update search input
      onLocationSelect(newLocation);
    }
  }, [onLocationSelect]);

  // Handle marker drag
  const onMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const address = await getAddressFromCoords(lat, lng);
      
      const newLocation = { lat, lng, address };
      setSelectedLocation(newLocation);
      setSearchValue(address); // ✅ Update search input
      onLocationSelect(newLocation);
    }
  }, [onLocationSelect]);

  // Handle autocomplete place selection
  const onPlaceChanged = useCallback(async () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || '';
        
        const newLocation = { lat, lng, address };
        setSelectedLocation(newLocation);
        setMapCenter(newLocation);
        setSearchValue(address); // ✅ Update search input
        onLocationSelect(newLocation);
      }
    }
  }, [onLocationSelect]);

  // Use current location
  const useCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const address = await getAddressFromCoords(lat, lng);
          
          const newLocation = { lat, lng, address };
          setSelectedLocation(newLocation);
          setMapCenter(newLocation);
          setSearchValue(address); // ✅ Update search input
          onLocationSelect(newLocation);
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please enable location services.');
          setIsGettingLocation(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setIsGettingLocation(false);
    }
  }, [onLocationSelect]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (!isLoaded) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center border-2 border-yellow-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400 mx-auto mb-3"></div>
          <p className="text-gray-800 font-semibold">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
        <button
          onClick={useCurrentLocation}
          disabled={isGettingLocation}
          className="flex items-center space-x-1 px-4 py-1.5 bg-yellow-400 text-black text-sm rounded-lg hover:bg-yellow-500 transition-colors disabled:bg-gray-400 font-bold border-2 border-black"
        >
          {isGettingLocation ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Getting...</span>
            </>
          ) : (
            <>
              <span>📍</span>
              <span>Use Current Location</span>
            </>
          )}
        </button>
      </div>

      {showSearch && (
        <SavedAddressesDropdown
          mode={mode}
          placeholder="Search or select a saved address..."
          selectedAddress={searchValue}
          currentLocation={selectedLocation}
          onSelect={(location) => {
            // Ensure valid location object
            const validLoc = {
              lat: typeof location?.lat === 'number' ? location.lat : selectedLocation.lat,
              lng: typeof location?.lng === 'number' ? location.lng : selectedLocation.lng,
              address: location?.address || '',
            };
            setSelectedLocation(validLoc);
            setMapCenter(validLoc);
            setSearchValue(validLoc.address || '');
            onLocationSelect(validLoc);
          }}
        />
      )}

      <div className="relative rounded-lg overflow-hidden border-4 border-yellow-400">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={{
            lat: typeof mapCenter?.lat === 'number' ? mapCenter.lat : 17.385044,
            lng: typeof mapCenter?.lng === 'number' ? mapCenter.lng : 78.486671,
          }}
          zoom={14}
          onClick={onMapClick}
          onLoad={onLoad}
          options={{
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          <Marker
            position={{
              lat: typeof selectedLocation?.lat === 'number' ? selectedLocation.lat : 17.385044,
              lng: typeof selectedLocation?.lng === 'number' ? selectedLocation.lng : 78.486671,
            }}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
            icon={{
              url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="56" viewBox="0 0 24 36">
                  <path d="M12 0C7.6 0 4 3.6 4 8c0 6.6 8 16 8 16s8-9.4 8-16c0-4.4-3.6-8-8-8z" fill="${markerColor}" stroke="#000000" stroke-width="2"/>
                  <circle cx="12" cy="8" r="3" fill="#000000"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(40, 56),
            }}
          />
        </GoogleMap>
        
        {/* Info overlay */}
        <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <p className="text-xs text-gray-500 mb-1">Selected Location:</p>
          <p className="text-sm font-semibold text-gray-800 line-clamp-2">
            {selectedLocation?.address || `${selectedLocation?.lat?.toFixed(6) || '0.000000'}, ${selectedLocation?.lng?.toFixed(6) || '0.000000'}`}
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-sm text-gray-800">
        <strong>💡 Tip:</strong> Click on the map or drag the pin to adjust the location precisely.
      </div>
    </div>
  );
}
