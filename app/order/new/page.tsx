'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import LocationNavbar from '@/components/LocationNavbar';
import MapLocationPicker from '@/components/MapLocationPicker';
import DeliveryInstructions from '@/components/DeliveryInstructions';
import MultiStopManager from '@/components/MultiStopManager';
import { DeliveryInstructions as DeliveryInstructionsType } from '@/types';
import { Waypoint, addWaypoint } from '@/lib/multistop';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

// Component that uses useSearchParams - must be wrapped in Suspense
function NewOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [city, setCity] = useState('Hyderabad');
  
  const [pickupLocation, setPickupLocation] = useState<Location>({
    lat: 17.385044,
    lng: 78.486671,
    address: 'Hitech City, Hyderabad',
  });
  
  const [dropLocation, setDropLocation] = useState<Location>({
    lat: 17.440826,
    lng: 78.348449,
    address: 'Gachibowli, Hyderabad',
  });

  // ✅ NEW: Handle address selection from saved addresses page
  useEffect(() => {
    const selectedAddress = searchParams.get('selectedAddress');
    const mode = searchParams.get('addressMode');
    
    if (selectedAddress && mode) {
      try {
        const address = JSON.parse(decodeURIComponent(selectedAddress));
        const location: Location = {
          lat: address.lat,
          lng: address.lng,
          address: address.fullAddress || address.address,
        };
        
        if (mode === 'pickup') {
          setPickupLocation(location);
          console.log('✅ Pickup location set from saved address:', location);
        } else if (mode === 'drop') {
          setDropLocation(location);
          console.log('✅ Drop location set from saved address:', location);
        }
        
        // Clean up URL params
        router.replace('/order/new', { scroll: false });
      } catch (error) {
        console.error('Error parsing selected address:', error);
      }
    }
  }, [searchParams, router]);

  // Quick test locations (2-3 min apart)
  const useQuickTestLocations = () => {
    setPickupLocation({
      lat: 17.385044,
      lng: 78.486671,
      address: 'HITEC City Metro, Hyderabad',
    });
    setDropLocation({
      lat: 17.390044, // Just ~500m away for quick testing
      lng: 78.490671,
      address: 'KIMS Hospital, Kondapur',
    });
    alert('✅ Quick test locations set (2-3 min delivery)');
  };

  const [formData, setFormData] = useState({
    itemName: '',
    customerName: '',
    customerPhone: '',
    houseNumber: '',
    landmark: '',
  });

  const [deliveryInstructions, setDeliveryInstructions] = useState<DeliveryInstructionsType>({
    type: 'ring_bell',
    contactPreference: 'call',
  });

  const [useMultiStop, setUseMultiStop] = useState(false);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [activeTab, setActiveTab] = useState<'pickup' | 'drop' | 'stop'>('pickup');

  const handlePlaceOrder = async () => {
    if (!formData.itemName || !formData.customerName || !formData.customerPhone) {
      alert('Please fill all required fields');
      return;
    }

    if (!pickupLocation || !dropLocation) {
      alert('Please select both pickup and drop locations');
      return;
    }

    setLoading(true);

    try {
      const newTaskId = `order_${Date.now()}`;

      const response = await axios.post('/api/order/create', {
        taskId: newTaskId,
        item: formData.itemName,
        pickup: {
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
          address: pickupLocation.address || `${pickupLocation.lat.toFixed(6)}, ${pickupLocation.lng.toFixed(6)}`,
        },
        destination: {
          lat: dropLocation.lat,
          lng: dropLocation.lng,
          address: dropLocation.address || `${dropLocation.lat.toFixed(6)}, ${dropLocation.lng.toFixed(6)}`,
        },
        customer: {
          name: formData.customerName,
          phone: formData.customerPhone,
        },
        waypoints: useMultiStop ? waypoints : undefined,
        deliveryInstructions,
      });

      if (response.data.success) {
        setTaskId(newTaskId);
        setOrderPlaced(true);
        
        setTimeout(() => {
          router.push(`/track/${newTaskId}`);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-yellow-400">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Order Placed!</h2>
          <p className="text-gray-600 mb-6">Finding a delivery partner for you...</p>
          
          <div className="bg-yellow-50 rounded-lg p-4 mb-6 border-2 border-yellow-400">
            <p className="text-sm text-gray-600 mb-1 font-semibold">Order ID</p>
            <p className="font-mono text-black font-bold">{taskId}</p>
          </div>

          <div className="space-y-2 mb-6 text-sm text-left">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-500 text-xl">📍</span>
              <div>
                <p className="font-semibold text-gray-700">Pickup</p>
                <p className="text-gray-600">{pickupLocation.address || 'Location selected on map'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-500 text-xl">🎯</span>
              <div>
                <p className="font-semibold text-gray-700">Drop</p>
                <p className="text-gray-600">{dropLocation.address || 'Location selected on map'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
            <span className="text-sm text-gray-600 font-semibold">Redirecting to tracking...</span>
          </div>

          <button
            onClick={() => router.push(`/track/${taskId}`)}
            className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors border-4 border-black"
          >
            View Live Tracking Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Location Navbar */}
      <LocationNavbar
        city={city}
        onCityChange={setCity}
        pickupLocation={pickupLocation}
        dropLocation={dropLocation}
        onPickupChange={setPickupLocation}
        onDropChange={setDropLocation}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold border-2 border-black">1</div>
              <span className="font-semibold text-gray-800">Select Locations</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">2</div>
              <span className="text-gray-500">Order Details</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">3</div>
              <span className="text-gray-500">Confirm</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Map Selection */}
          <div className="space-y-6">
            {/* Tab Selector */}
            <div className="bg-white rounded-2xl shadow-md p-1 flex border-2 border-yellow-400">
              <button
                onClick={() => setActiveTab('pickup')}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'pickup'
                    ? 'bg-yellow-400 text-black shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                📍 Pickup
              </button>
              {useMultiStop && waypoints.length > 0 && (
                <button
                  onClick={() => setActiveTab('stop')}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === 'stop'
                      ? 'bg-yellow-400 text-black shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  🚩 Stops
                </button>
              )}
              <button
                onClick={() => setActiveTab('drop')}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'drop'
                    ? 'bg-yellow-400 text-black shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                🎯 Drop
              </button>
            </div>

            {/* Map Picker */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  {activeTab === 'pickup' ? '📍 Select Pickup' : '🎯 Select Drop'}
                </h3>
                <button
                  onClick={() => router.push(`/addresses?mode=${activeTab}&returnTo=order`)}
                  className="text-sm text-yellow-600 hover:text-yellow-700 font-semibold flex items-center space-x-1 border-2 border-yellow-400 px-3 py-1 rounded-lg"
                >
                  <span>📋</span>
                  <span>Saved Addresses</span>
                </button>
              </div>
              
              {activeTab === 'pickup' ? (
                <MapLocationPicker
                  initialLocation={pickupLocation}
                  onLocationSelect={setPickupLocation}
                  label="Select Pickup Point on Map"
                  markerColor="#fbbf24"
                  showSearch={true}
                  mode="pickup"
                />
              ) : (
                <MapLocationPicker
                  initialLocation={dropLocation}
                  onLocationSelect={setDropLocation}
                  label="Select Drop Point on Map"
                  markerColor="#fbbf24"
                  showSearch={true}
                  mode="drop"
                />
              )}
            </div>

            {/* Selected Locations Summary */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">📋 Selected Locations</h3>
                <button
                  onClick={useQuickTestLocations}
                  className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 font-bold"
                  title="Set nearby locations for quick 2-3 min testing"
                >
                  ⚡ Quick Test
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
                  <p className="text-xs text-yellow-700 font-semibold mb-1">⚡ PICKUP LOCATION</p>
                  <p className="text-sm text-gray-800">{pickupLocation.address || 'Location selected on map'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {pickupLocation?.lat?.toFixed(6) || '0.000000'}, {pickupLocation?.lng?.toFixed(6) || '0.000000'}
                  </p>
                </div>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
                  <p className="text-xs text-yellow-700 font-semibold mb-1">⚡ DROP LOCATION</p>
                  <p className="text-sm text-gray-800">{dropLocation.address || 'Location selected on map'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dropLocation?.lat?.toFixed(6) || '0.000000'}, {dropLocation?.lng?.toFixed(6) || '0.000000'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Order Details Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📦 Order Details</h2>
              
              <div className="space-y-4">
                {/* Item Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    What are you sending? *
                  </label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    placeholder="e.g., Documents, Food, Groceries..."
                    className="w-full px-4 py-3 border-2 border-yellow-400/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </div>

                {/* House Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    House/Flat/Building Number
                  </label>
                  <input
                    type="text"
                    value={formData.houseNumber}
                    onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                    placeholder="e.g., Flat 301, Building A"
                    className="w-full px-4 py-3 border-2 border-yellow-400/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </div>

                {/* Landmark */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    placeholder="e.g., Near Metro Station"
                    className="w-full px-4 py-3 border-2 border-yellow-400/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </div>

                <hr className="my-6" />

                {/* Customer Details */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border-2 border-yellow-400/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="+91-9876543210"
                    className="w-full px-4 py-3 border-2 border-yellow-400/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </div>

                {/* Order Summary */}
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border-2 border-yellow-400">
                  <h3 className="font-semibold text-gray-800 mb-3">📊 Order Summary</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>Item:</span>
                      <span className="font-semibold">{formData.itemName || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>City:</span>
                      <span className="font-semibold">{city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Time:</span>
                      <span className="font-semibold text-yellow-600">~30 mins</span>
                    </div>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg hover:shadow-xl border-4 border-black'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Placing Order...
                    </span>
                  ) : (
                    '🚀 Place Order & Find Delivery Partner'
                  )}
                </button>
              </div>
            </div>

            {/* Delivery Instructions */}
            <DeliveryInstructions
              instructions={deliveryInstructions}
              onSave={setDeliveryInstructions}
            />

            {/* Multi-Stop Toggle & Manager */}
            <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-yellow-400">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <span className="text-yellow-400 mr-2">🗺️</span>
                  Multiple Stops
                </h3>
                <button
                  onClick={() => {
                    setUseMultiStop(!useMultiStop);
                    if (!useMultiStop && waypoints.length === 0) {
                      // Initialize with pickup and drop
                      const initial: Waypoint[] = [
                        { ...pickupLocation, order: 0, type: 'pickup' },
                        { ...dropLocation, order: 1, type: 'destination' },
                      ];
                      setWaypoints(initial);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    useMultiStop
                      ? 'bg-yellow-400 text-black border-2 border-black'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {useMultiStop ? 'Enabled ✓' : 'Enable'}
                </button>
              </div>
              
              {useMultiStop ? (
                <MultiStopManager
                  waypoints={waypoints}
                  onWaypointsChange={setWaypoints}
                  onAddStop={() => setActiveTab('stop')}
                />
              ) : (
                <p className="text-sm text-gray-600">
                  Add multiple pickup or drop-off points in a single delivery
                </p>
              )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center shadow">
                <div className="text-3xl mb-2">⚡</div>
                <p className="text-sm font-semibold text-gray-700">Fast</p>
                <p className="text-xs text-gray-500">30 mins</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow">
                <div className="text-3xl mb-2">📍</div>
                <p className="text-sm font-semibold text-gray-700">Live Track</p>
                <p className="text-xs text-gray-500">Real-time</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm font-semibold text-gray-700">Secure</p>
                <p className="text-xs text-gray-500">Verified</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function NewOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <NewOrderPageContent />
    </Suspense>
  );
}
