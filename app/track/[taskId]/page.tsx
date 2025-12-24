'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import LiveMap from '@/components/LiveMap';
import StatusPanel from '@/components/StatusPanel';
import DriverCard from '@/components/DriverCard';
import EnhancedTrackingHeader from '@/components/EnhancedTrackingHeader';
import RealTimeMetrics from '@/components/RealTimeMetrics';
import BottomSheet from '@/components/BottomSheet';
import ShareTripModal from '@/components/ShareTripModal';
import SOSModal from '@/components/SOSModal';
import ToastContainer from '@/components/ToastNotification';
import ProofOfDeliveryModal from '@/components/ProofOfDeliveryModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useSocket } from '@/hooks/useSocket';
import { getRoute, generateFallbackRoute } from '@/lib/routing';
import { notificationService } from '@/lib/notification';

export default function TrackingPage() {
  const params = useParams();
  const taskId = params?.taskId as string;
  
  const {
    trackingData,
    currentLocation,
    isConnected,
    isLoading,
    error,
    setTaskId,
    setTrackingData,
    setLoading,
    setError,
    initializeGeofencing,
    checkGeofence,
    lastGeofenceEvent,
    insidePickupZone,
    insideDestinationZone,
  } = useTrackingStore();

  const [route, setRoute] = useState<Array<{ lat: number; lng: number }> | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showPODModal, setShowPODModal] = useState(false);
  const [deliveryOTP, setDeliveryOTP] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartRef = useRef(0);

  // Initialize WebSocket/Polling
  useSocket(taskId);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    notificationService.requestPermission();
  }, []);

  // Listen for agent acceptance notification
  useEffect(() => {
    if (!trackingData) return;

    // Check if driver just got assigned
    if (trackingData.driver && trackingData.status !== 'PENDING') {
      const hasShownNotification = sessionStorage.getItem(`agent_accepted_${taskId}`);
      
      if (!hasShownNotification) {
        // Show notification
        notificationService.showToast(
          'success',
          '🎉 Agent Accepted!',
          `${trackingData.driver.name} accepted your order. They will arrive in ${trackingData.eta || 'soon'}`,
          { duration: 5000 }
        );
        
        // Mark as shown
        sessionStorage.setItem(`agent_accepted_${taskId}`, 'true');
      }
    }
  }, [trackingData, taskId]);

  // Pull to refresh
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        pullStartRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pullStartRef.current === 0) return;
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartRef.current;
      
      if (distance > 0 && distance < 100) {
        setPullDistance(distance);
        setIsPulling(true);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > 60) {
        // Trigger refresh
        setLoading(true);
        try {
          const response = await axios.get(`/api/task/${taskId}/live`);
          setTrackingData({
            taskId,
            pickup: response.data.pickup,
            destination: response.data.destination,
            currentLocation: { lat: response.data.lat, lng: response.data.lng },
            status: response.data.status,
            eta: response.data.eta,
            driver: response.data.driver,
            distance: response.data.distance,
            duration: response.data.duration,
          });
          notificationService.showToast('success', '✅ Refreshed', 'Tracking data updated', { duration: 2000 });
        } catch (err) {
          console.error('Refresh failed:', err);
        } finally {
          setLoading(false);
        }
      }
      
      setIsPulling(false);
      setPullDistance(0);
      pullStartRef.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, pullDistance, taskId, setTrackingData, setLoading]);

  // Auto-show POD modal when delivery is completed (driver side)
  useEffect(() => {
    if (trackingData?.status === 'ARRIVING' && !trackingData.proofOfDelivery) {
      // Show POD when driver is arriving
      setShowPODModal(true);
    }
  }, [trackingData?.status, trackingData?.proofOfDelivery]);

  // Fetch initial tracking data
  useEffect(() => {
    if (!taskId) return;

    const fetchInitialData = async () => {
      setLoading(true);
      setTaskId(taskId);

      try {
        // Auto-initialize demo task if it's the demo
        if (taskId === 'demo-task-123') {
          try {
            await axios.get('/api/demo/init');
          } catch (initError) {
            console.log('Demo task may already exist, continuing...');
          }
        }

        const response = await axios.get(`/api/task/${taskId}/live`);
        const data = response.data;

        setTrackingData({
          taskId,
          pickup: data.pickup,
          destination: data.destination,
          currentLocation: { lat: data.lat, lng: data.lng },
          status: data.status,
          eta: data.eta,
          driver: data.driver,
          distance: data.distance,
          duration: data.duration,
        });

        // Store OTP if available
        if (data.deliveryOTP) {
          setDeliveryOTP(data.deliveryOTP);
        }

        // Initialize geofencing
        initializeGeofencing(data.pickup, data.destination);

        // Fetch route from server-side API to avoid exposing API key
        try {
          const routeResponse = await axios.get(
            `/api/route/${taskId}?pickupLat=${data.pickup.lat}&pickupLng=${data.pickup.lng}&destLat=${data.destination.lat}&destLng=${data.destination.lng}`
          );
          if (routeResponse.data.route) {
            setRoute(routeResponse.data.route);
          } else {
            // Fallback to straight line
            const fallbackRoute = generateFallbackRoute(data.pickup, data.destination);
            setRoute(fallbackRoute);
          }
        } catch (routeError) {
          console.error('Error fetching route:', routeError);
          // Fallback to straight line on error
          const fallbackRoute = generateFallbackRoute(data.pickup, data.destination);
          setRoute(fallbackRoute);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching tracking data:', err);
        setError(err.response?.data?.error || 'Failed to load tracking data');
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [taskId, setTaskId, setTrackingData, setLoading, setError, initializeGeofencing]);

  // Monitor geofence events
  useEffect(() => {
    if (lastGeofenceEvent && trackingData) {
      const { type, zone } = lastGeofenceEvent;
      
      if (type === 'entered' || type === 'approaching') {
        notificationService.notifyGeofenceEvent(
          type,
          zone.type,
          zone.name
        );
      }
    }
  }, [lastGeofenceEvent, trackingData]);

  if (isLoading) {
    return <SkeletonLoader variant="tracking" />;
  }

  if (error && !trackingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md border-4 border-yellow-400">
          <div className="text-red-500 text-5xl mb-4 text-center">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Tracking Unavailable
          </h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-yellow-400 text-black py-3 rounded-lg font-bold hover:bg-yellow-500 transition-colors border-4 border-black"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!trackingData) {
    return null;
  }

  // Show delivery completed celebration
  if (trackingData.status === 'COMPLETED' && trackingData.proofOfDelivery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-4 border-green-400 text-center">
          <div className="text-6xl mb-4 animate-bounce">✅</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Delivered Successfully!</h2>
          <p className="text-gray-600 mb-6">Your package has been delivered</p>
          
          <div className="bg-green-50 rounded-lg p-4 mb-6 border-2 border-green-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Delivered at:</span>
              <span className="font-semibold">{new Date(trackingData.proofOfDelivery.deliveredAt || '').toLocaleTimeString()}</span>
            </div>
            {trackingData.proofOfDelivery.recipientName && (
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Received by:</span>
                <span className="font-semibold">{trackingData.proofOfDelivery.recipientName}</span>
              </div>
            )}
            {trackingData.proofOfDelivery.otpVerified && (
              <div className="flex items-center justify-center text-green-600 text-sm font-bold mt-2">
                <span className="mr-2">🔒</span> OTP Verified
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-colors"
            >
              Back to Home
            </button>
            <button
              onClick={() => window.location.href = '/history'}
              className="w-full bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold transition-colors"
            >
              View Order History
            </button>
          </div>
        </div>
      </div>
    );
  }

  const trackingUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCall = () => {
    if (trackingData.driver?.phone) {
      window.location.href = `tel:${trackingData.driver.phone}`;
    }
  };

  const handleChat = () => {
    notificationService.showToast('info', '💬 Chat Feature', 'Chat with driver coming soon!', {
      duration: 3000,
    });
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleSOS = () => {
    setShowSOSModal(true);
  };

  const handlePODSubmit = async (pod: any) => {
    try {
      // Submit POD to backend
      const response = await axios.post('/api/delivery/complete', {
        taskId,
        otp: pod.otp,
        proofOfDelivery: pod,
      });

      if (response.data.success) {
        notificationService.showToast('success', '✅ Delivery Confirmed', 'Proof of delivery submitted successfully!');
        setShowPODModal(false);
        
        // Refresh tracking data to show completed status
        const updatedData = await axios.get(`/api/task/${taskId}/live`);
        setTrackingData({
          ...trackingData!,
          status: 'COMPLETED',
          proofOfDelivery: pod,
        });
      }
    } catch (error: any) {
      console.error('POD submission failed:', error);
      notificationService.showToast('error', '❌ Error', error.response?.data?.error || 'Failed to submit delivery proof');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-[300px] lg:pb-6">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Pull to Refresh Indicator (Mobile) */}
      {isPulling && isMobile && (
        <div 
          className="fixed top-16 left-0 right-0 z-50 flex items-center justify-center transition-all"
          style={{ transform: `translateY(${Math.min(pullDistance, 60)}px)` }}
        >
          <div className="bg-yellow-400 text-black px-6 py-3 rounded-full shadow-lg font-bold flex items-center space-x-2 border-2 border-black">
            <svg 
              className={`w-5 h-5 ${pullDistance > 60 ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}</span>
          </div>
        </div>
      )}

      {/* Offline Mode Indicator */}
      {!isConnected && trackingData && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-red-500 text-white px-4 py-2 text-center text-sm font-bold">
          ⚠️ Offline Mode - Showing last known data
        </div>
      )}

      {/* Enhanced Header */}
      <EnhancedTrackingHeader
        taskId={taskId}
        isConnected={isConnected}
        customerName={trackingData.customer?.name}
        itemName={trackingData.item}
      />

      {/* Sticky ETA Bar */}
      <div className={`sticky top-16 z-40 border-b-4 border-black shadow-lg ${
        trackingData.status === 'COMPLETED' 
          ? 'bg-gradient-to-r from-green-400 to-green-500' 
          : 'bg-gradient-to-r from-yellow-400 to-yellow-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-black text-yellow-400 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                {trackingData.status === 'COMPLETED' ? '✅' :
                 trackingData.status === 'ON_THE_WAY' ? '🚗' : 
                 trackingData.status === 'ARRIVING' ? '📍' : 
                 trackingData.status === 'PICKED_UP' ? '📦' : '🔍'}
              </div>
              <div>
                <p className="text-sm font-bold text-black">
                  {trackingData.status === 'PENDING' && 'Finding Partner...'}
                  {trackingData.status === 'PICKED_UP' && 'Package Picked Up'}
                  {trackingData.status === 'ON_THE_WAY' && 'On The Way'}
                  {trackingData.status === 'ARRIVING' && 'Arriving Soon'}
                  {trackingData.status === 'COMPLETED' && 'Delivered'}
                  {trackingData.status === 'CANCELLED' && 'Cancelled'}
                </p>
                <p className="text-xs text-gray-800 font-semibold">
                  {trackingData.status === 'COMPLETED' ? 'Delivered!' : `ETA: ${trackingData.eta}`}
                </p>
              </div>
            </div>
            {trackingData.remainingDistance && (
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-xs text-gray-800">Distance</p>
                  <p className="text-lg font-bold text-black">{trackingData.remainingDistance.toFixed(1)} km</p>
                </div>
                {trackingData.speed && (
                  <div className="text-right">
                    <p className="text-xs text-gray-800">Speed</p>
                    <p className="text-lg font-bold text-black">{trackingData.speed.toFixed(0)} km/h</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-2 bg-black/20 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-black h-full transition-all duration-500"
              style={{ 
                width: `${
                  trackingData.status === 'PENDING' ? 0 :
                  trackingData.status === 'PICKED_UP' ? 25 :
                  trackingData.status === 'ON_THE_WAY' ? 50 :
                  trackingData.status === 'ARRIVING' ? 75 :
                  trackingData.status === 'COMPLETED' ? 100 : 0
                }%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content - Desktop Layout */}
      {!isMobile ? (
        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-yellow-400" style={{ height: '600px' }}>
                <LiveMap
                  pickup={trackingData.pickup}
                  destination={trackingData.destination}
                  currentLocation={currentLocation || trackingData.currentLocation}
                  route={route || undefined}
                  driverName={trackingData.driver?.name || 'Driver'}
                />
              </div>
            </div>

            {/* Info Section */}
            <div className="space-y-6">
              {/* OTP Display - Prominent */}
              {deliveryOTP && trackingData.status !== 'COMPLETED' && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-2xl p-6 border-4 border-blue-700 animate-pulse-slow">
                  <div className="text-center">
                    <p className="text-sm font-bold mb-2 text-blue-100">🔐 YOUR DELIVERY OTP</p>
                    <p className="text-5xl font-black tracking-widest mb-3">{deliveryOTP}</p>
                    <p className="text-xs text-blue-100 leading-relaxed">
                      Share this code with the delivery partner when they arrive
                    </p>
                  </div>
                </div>
              )}

              <StatusPanel
                status={trackingData.status}
                eta={trackingData.eta}
                distance={trackingData.remainingDistance || trackingData.distance}
              />

              <RealTimeMetrics
                speed={trackingData.speed}
                remainingDistance={trackingData.remainingDistance}
                currentStreet={trackingData.currentStreet}
                traffic={trackingData.traffic}
              />

              {/* Geofence Status */}
              {(insidePickupZone || insideDestinationZone) && (
                <div className="bg-white rounded-lg shadow-xl p-4 border-2 border-green-400 animate-bounce-in">
                  <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    Zone Status
                  </h3>
                  {insidePickupZone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-2xl">📍</span>
                      <span className="font-semibold text-green-700">Driver at pickup location</span>
                    </div>
                  )}
                  {insideDestinationZone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-2xl">🎯</span>
                      <span className="font-semibold text-green-700">Driver at destination</span>
                    </div>
                  )}
                </div>
              )}

              {trackingData.driver ? (
                <DriverCard
                  driver={trackingData.driver}
                  isConnected={isConnected}
                />
              ) : (
                <div className="bg-white rounded-lg shadow-xl p-6 border-2 border-yellow-400">
                  <div className="text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Finding Delivery Partner
                    </h3>
                    <p className="text-sm text-gray-600">
                      Please wait while we assign a delivery partner to your order...
                    </p>
                    <div className="mt-4 flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                      <span className="text-sm text-gray-600 font-semibold">Searching...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions - Desktop */}
              <div className="bg-white rounded-lg shadow-xl p-4 border-2 border-yellow-400">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleShare}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center space-x-2 shadow-md"
                  >
                    <span className="text-xl">📤</span>
                    <span>Share Trip</span>
                  </button>
                  <button
                    onClick={handleSOS}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center space-x-2 shadow-md"
                  >
                    <span className="text-xl">🚨</span>
                    <span>Emergency SOS</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* Mobile Layout - Full Screen Map with Bottom Sheet */
        <>
          <div className="fixed top-16 left-0 right-0 bottom-0 z-10">
            <LiveMap
              pickup={trackingData.pickup}
              destination={trackingData.destination}
              currentLocation={currentLocation || trackingData.currentLocation}
              route={route || undefined}
              driverName={trackingData.driver?.name || 'Driver'}
            />
          </div>

          {/* Bottom Sheet - Mobile */}
          <BottomSheet
            driver={trackingData.driver}
            status={trackingData.status}
            eta={trackingData.eta}
            distance={trackingData.remainingDistance || trackingData.distance}
            speed={trackingData.speed}
            currentStreet={trackingData.currentStreet}
            onCall={handleCall}
            onChat={handleChat}
            onShare={handleShare}
            onSOS={handleSOS}
            insidePickupZone={insidePickupZone}
            insideDestinationZone={insideDestinationZone}
            deliveryOTP={deliveryOTP}
          />
        </>
      )}

      {/* Modals */}
      <ShareTripModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        trackingUrl={trackingUrl}
        eta={trackingData.eta}
      />

      <SOSModal
        isOpen={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        driverName={trackingData.driver?.name}
        driverPhone={trackingData.driver?.phone}
        taskId={taskId}
      />

      <ProofOfDeliveryModal
        isOpen={showPODModal}
        onClose={() => setShowPODModal(false)}
        onSubmit={handlePODSubmit}
        taskId={taskId}
        expectedOTP={deliveryOTP || trackingData?.deliveryOTP}
      />
    </div>
  );
}
