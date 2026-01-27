'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useMapsContext } from '@/components/MapsProvider';

interface SavedAddress {
  _id: string;
  label: string;
  fullAddress: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
}

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface SavedAddressesDropdownProps {
  onSelect: (location: Location) => void;
  placeholder?: string;
  selectedAddress?: string;
  onSaveAddress?: (address: SavedAddress) => void;
  mode: 'pickup' | 'drop';
  currentLocation?: Location; // ✅ Add this to get coordinates for saving
}

export default function SavedAddressesDropdown({
  onSelect,
  placeholder = 'Search or select a location',
  selectedAddress,
  onSaveAddress,
  mode,
  currentLocation,
}: SavedAddressesDropdownProps) {
  const { isLoaded } = useMapsContext();
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize Autocomplete Service
  useEffect(() => {
    if (isLoaded && window.google && !autocompleteService.current) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Fetch predictions when query changes
  useEffect(() => {
    const fetchPredictions = async () => {
      if (!searchQuery || searchQuery.length < 2 || !autocompleteService.current) {
        setPredictions([]);
        return;
      }

      // Don't fetch if query matches an existing address exactly (to avoid noise)
      // but here we want suggestions so maybe we should.

      const request: google.maps.places.AutocompletionRequest = {
        input: searchQuery,
        componentRestrictions: { country: 'in' }, // Restrict to India
      };

      // Optional: Bias towards current map center/location if available
      if (currentLocation) {
        request.locationBias = new google.maps.Circle({
          center: currentLocation,
          radius: 50000, // 50km bias
        });
      }

      try {
        autocompleteService.current.getPlacePredictions(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
          } else {
            setPredictions([]);
          }
        });
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setPredictions([]);
      }
    };

    const timer = setTimeout(fetchPredictions, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery, currentLocation, isLoaded]);

  const handlePredictionSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!window.google) return;

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ placeId: prediction.place_id });

      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        onSelect({
          lat: location.lat(),
          lng: location.lng(),
          address: prediction.description,
        });
        setSearchQuery(''); // Clear search
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error getting location details:', error);
      alert('Failed to get location details. Please try again.');
    }
  };

  // Load saved addresses
  useEffect(() => {
    if (isOpen) {
      loadSavedAddresses();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSavedAddresses = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/user/addresses');
      if (response.data.success) {
        setSavedAddresses(response.data.addresses || []);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (address: SavedAddress) => {
    onSelect({
      lat: address.lat,
      lng: address.lng,
      address: address.fullAddress,
    });
    setSearchQuery(''); // ✅ Clear search - selectedAddress will show in input
    setIsOpen(false);
  };

  const handleSaveCurrentAddress = async () => {
    if (!selectedAddress || !currentLocation || isSaving) {
      return;
    }

    setIsSaving(true);

    // Extract pincode from address if available
    const pincodeMatch = selectedAddress.match(/\b\d{6}\b/);
    const pincode = pincodeMatch ? pincodeMatch[0] : '500001'; // Default Hyderabad pincode

    const addressData = {
      label: 'OTHER',
      fullAddress: selectedAddress,
      houseNumber: 'N/A',
      landmark: '',
      cityId: 'hyderabad',
      cityName: 'Hyderabad',
      pincode: pincode,
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
    };

    console.log('🔍 Saving address:', addressData);

    try {
      const response = await axios.post('/api/user/addresses', addressData);

      if (response.data.success) {
        if (onSaveAddress) {
          onSaveAddress(response.data.address);
        }
        await loadSavedAddresses();
        // Reset saving state after successful save
        setTimeout(() => setIsSaving(false), 500);
      }
    } catch (error: any) {
      console.error('❌ Error saving address:', error);
      console.error('📋 Error response:', error.response);
      console.error('📝 Error data:', error.response?.data);
      console.error('🔍 Validation details:', error.response?.data?.details);

      setIsSaving(false);

      let errorMsg = 'Unknown error';

      if (error.response?.data?.details) {
        const details = error.response.data.details;
        errorMsg = details.map((e: any) => `${e.path?.join('.') || 'field'}: ${e.message}`).join('\n');
        console.error('❗ Validation errors:', errorMsg);
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else {
        errorMsg = error.message;
      }

      alert('❌ Failed to save:\n' + errorMsg);
    }
  };

  const filteredAddresses = savedAddresses.filter((addr) =>
    addr.fullAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addr.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentAddresses = filteredAddresses.slice(0, 5);

  // Sync search query with selected address from parent keys
  useEffect(() => {
    if (selectedAddress) {
      setSearchQuery(selectedAddress);
    }
  }, [selectedAddress]);

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value) {
              setIsOpen(true); // ✅ Open dropdown when typing
            }
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 pr-12 border-2 border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm font-medium"
        />

        {/* Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600">
          {mode === 'pickup' ? '📍' : '🎯'}
        </div>

        {/* Save Icon - Shows when address is selected */}
        {selectedAddress && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isSaving && !savedAddresses.find(a => a.fullAddress === selectedAddress)) {
                handleSaveCurrentAddress();
              }
            }}
            disabled={isSaving || savedAddresses.some(a => a.fullAddress === selectedAddress)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 ${savedAddresses.some(a => a.fullAddress === selectedAddress) || isSaving
              ? 'text-yellow-600 scale-110'
              : 'text-gray-400 hover:text-yellow-600 hover:scale-110'
              }`}
            title={savedAddresses.some(a => a.fullAddress === selectedAddress) ? 'Address saved' : 'Click to save address'}
          >
            {isSaving ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill={savedAddresses.some(a => a.fullAddress === selectedAddress) || isSaving ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            )}
          </button>
        )}

        {/* Dropdown Arrow */}
        <div className={`absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>



      {/* Dropdown Menu */}
      {isOpen && (predictions.length > 0 || loading) && (
        <div className="absolute z-10 mt-2 w-full bg-white border-2 border-yellow-400 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          ) : (
            <>
              <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200 border-t-4 border-t-yellow-400/20">
                <p className="text-xs font-bold text-gray-500 flex items-center uppercase">
                  <span className="mr-1">🔍</span>
                  Suggestions
                </p>
              </div>
              {predictions.map((prediction) => (
                <button
                  key={prediction.place_id}
                  onClick={() => handlePredictionSelect(prediction)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm text-gray-400">
                        🌍
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {prediction.structured_formatting.main_text}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {prediction.structured_formatting.secondary_text}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
