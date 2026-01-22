'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { SavedAddress } from '@/types';
import SkeletonLoader from '@/components/SkeletonLoader';
import { formatAddress } from '@/lib/addressValidation';

// Component that uses useSearchParams - must be wrapped in Suspense
function SavedAddressesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // ✅ NEW: Check if in selection mode
  const mode = searchParams.get('mode'); // 'pickup' or 'drop'
  const returnTo = searchParams.get('returnTo'); // 'order'
  const isSelectionMode = mode && returnTo;

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get('/api/user/addresses', {
        headers: { 'x-user-id': 'demo-user' },
      });
      setAddresses(response.data.addresses || []);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await axios.put(`/api/user/addresses/${id}/default`, {}, {
        headers: { 'x-user-id': 'demo-user' },
      });
      fetchAddresses();
    } catch (error) {
      alert('Failed to set default address');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    setDeletingId(id);
    try {
      await axios.delete(`/api/user/addresses/${id}`, {
        headers: { 'x-user-id': 'demo-user' },
      });
      fetchAddresses();
    } catch (error) {
      alert('Failed to delete address');
    } finally {
      setDeletingId(null);
    }
  };

  // ✅ NEW: Handle address selection
  const handleSelectAddress = (address: SavedAddress) => {
    if (!isSelectionMode) return;
    
    const addressData = {
      lat: address.latitude,
      lng: address.longitude,
      fullAddress: address.fullAddress,
      address: address.fullAddress,
    };
    
    const encodedAddress = encodeURIComponent(JSON.stringify(addressData));
    router.push(`/order/new?selectedAddress=${encodedAddress}&addressMode=${mode}`);
  };

  if (loading) {
    return <SkeletonLoader variant="history" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50 border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(isSelectionMode ? '/order/new' : '/')}
                className="text-gray-600 hover:text-black transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <span className="text-yellow-400 mr-2">📍</span>
                  {isSelectionMode ? `Select ${mode === 'pickup' ? 'Pickup' : 'Drop'} Address` : 'Saved Addresses'}
                </h1>
                {isSelectionMode && (
                  <p className="text-sm text-gray-600 mt-1">Tap an address to select it</p>
                )}
              </div>
            </div>
            {!isSelectionMode && (
              <button
                onClick={() => router.push('/addresses/new')}
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded-lg font-bold transition-colors border-2 border-black flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Add New</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {addresses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-gray-200">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Saved Addresses</h3>
            <p className="text-gray-600 mb-6">Add your delivery addresses for quick booking</p>
            <button
              onClick={() => router.push('/addresses/new')}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold transition-colors border-2 border-black"
            >
              Add Your First Address
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                onClick={() => isSelectionMode && handleSelectAddress(address)}
                className={`bg-white rounded-xl shadow-md p-5 border-2 transition-all ${
                  isSelectionMode 
                    ? 'border-yellow-400 hover:border-yellow-500 hover:shadow-lg cursor-pointer hover:scale-102' 
                    : 'border-gray-200 hover:border-yellow-400'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      address.label === 'HOME' ? 'bg-green-100 text-green-800' :
                      address.label === 'WORK' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {address.label === 'HOME' && '🏠 '}
                      {address.label === 'WORK' && '💼 '}
                      {address.label === 'OTHER' && '📍 '}
                      {address.label}
                    </div>
                    {address.isDefault && (
                      <span className="bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold">
                        ⭐ DEFAULT
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="font-bold text-gray-900 mb-1">{address.houseNumber}</p>
                  <p className="text-gray-700 text-sm">{address.fullAddress}</p>
                  {address.landmark && (
                    <p className="text-gray-600 text-sm mt-1">
                      Landmark: {address.landmark}
                    </p>
                  )}
                  <p className="text-gray-600 text-sm mt-1">
                    {address.cityName} - {address.pincode}
                  </p>
                </div>

                {isSelectionMode ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAddress(address);
                    }}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-bold transition-colors border-2 border-black flex items-center justify-center space-x-2"
                  >
                    <span>✅</span>
                    <span>Select this {mode === 'pickup' ? 'Pickup' : 'Drop'} Location</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-2 rounded-lg font-bold transition-colors text-sm border-2 border-black"
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/addresses/edit/${address.id}`)}
                    className="flex-1 bg-white hover:bg-gray-50 text-black py-2 rounded-lg font-bold transition-colors border-2 border-yellow-400 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                    className="flex-1 bg-white hover:bg-red-50 text-red-600 py-2 rounded-lg font-bold transition-colors border-2 border-red-400 text-sm disabled:opacity-50"
                  >
                    {deletingId === address.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SavedAddressesPage() {
  return (
    <Suspense fallback={<SkeletonLoader variant="history" />}>
      <SavedAddressesContent />
    </Suspense>
  );
}
