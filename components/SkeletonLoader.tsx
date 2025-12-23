'use client';

import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'tracking' | 'order' | 'history' | 'card';
}

export default function SkeletonLoader({ variant = 'tracking' }: SkeletonLoaderProps) {
  if (variant === 'tracking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white shadow-lg border-b-4 border-gray-300">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-gray-300 rounded w-48"></div>
              <div className="flex space-x-2">
                <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Skeleton */}
        <div className="relative h-[calc(100vh-200px)]">
          <div className="absolute inset-0 bg-gray-200">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                <div className="h-4 bg-gray-300 rounded w-32"></div>
              </div>
            </div>
          </div>

          {/* Controls Skeleton */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Bottom Info Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 border-t-4 border-gray-300">
          <div className="space-y-4">
            <div className="h-6 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="flex space-x-3">
              <div className="flex-1 h-12 bg-gray-300 rounded-lg"></div>
              <div className="flex-1 h-12 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'order') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 animate-pulse">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map Skeleton */}
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded-2xl"></div>
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
            </div>
            {/* Form Skeleton */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 space-y-4">
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-14 bg-gray-300 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'history') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 animate-pulse">
        <div className="max-w-7xl mx-auto">
          <div className="h-12 bg-gray-300 rounded-xl mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 border-2 border-gray-200">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div className="h-6 bg-gray-300 rounded w-32"></div>
                    <div className="h-6 bg-gray-300 rounded w-24"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="flex space-x-2">
                    <div className="flex-1 h-10 bg-gray-300 rounded-lg"></div>
                    <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <div className="bg-white rounded-xl shadow-md p-5 border-2 border-gray-200 animate-pulse">
      <div className="space-y-3">
        <div className="h-6 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-10 bg-gray-300 rounded-lg"></div>
      </div>
    </div>
  );
}
