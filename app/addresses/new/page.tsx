'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import MapLocationPicker from '@/components/MapLocationPicker';
import AddressForm from '@/components/AddressForm';
import { SavedAddress } from '@/types';

export default function NewAddressPage() {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 17.385044,
    lng: 78.486671,
    address: 'Hyderabad',
  });
  const [city] = useState('Hyderabad');
  const [saving, setSaving] = useState(false);

  const handleLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    setSelectedLocation({
      lat: location.lat,
      lng: location.lng,
      address: location.address || 'Hyderabad',
    });
  };

  const handleSubmit = async (formData: Partial<SavedAddress>) => {
    setSaving(true);
    try {
      const addressData = {
        ...formData,
        cityId: city.toLowerCase(),
        cityName: city,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        fullAddress: formData.fullAddress || selectedLocation.address || '',
      };

      await axios.post('/api/user/addresses', addressData, {
        headers: { 'x-user-id': 'demo-user' },
      });

      alert('✅ Address saved successfully!');
      router.push('/addresses');
    } catch (error: any) {
      console.error('Failed to save address:', error);
      alert('❌ Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50 border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-black transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-yellow-400 mr-2">➕</span>
              Add New Address
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
          {/* Location Picker */}
          <div className="mb-6">
            <MapLocationPicker
              initialLocation={selectedLocation}
              onLocationSelect={handleLocationSelect}
              label="Select location on map"
              markerColor="#fbbf24"
              showSearch={true}
            />
          </div>

          <div className="border-t-2 border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Address Details</h3>
            <AddressForm
              initialAddress={{
                fullAddress: selectedLocation.address,
              }}
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
              submitLabel={saving ? 'Saving...' : 'Save Address'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
