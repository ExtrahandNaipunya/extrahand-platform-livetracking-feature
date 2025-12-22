'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderPage() {
  const router = useRouter();

  // Redirect to new map-based order page
  useEffect(() => {
    router.push('/order/new');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to order page...</p>
      </div>
    </div>
  );
}
