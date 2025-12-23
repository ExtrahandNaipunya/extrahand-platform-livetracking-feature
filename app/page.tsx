import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <div className="text-6xl mb-4">⚡📦</div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            ExtraHand Live Tracking
          </h1>
          <p className="text-xl text-gray-600">
            Complete Real-Time Delivery Tracking Platform
          </p>
        </div>

        {/* Main Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* User Order Module */}
          <Link href="/order/new">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer border-4 border-yellow-400 hover:border-yellow-500">
              <div className="text-5xl mb-4">🛍️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Place Order
              </h2>
              <p className="text-gray-600 mb-4">
                Select locations on map & track delivery live
              </p>
              <div className="inline-block bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded mb-2 font-semibold">
                ✨ Map-Based Selection
              </div>
              <div className="flex items-center text-yellow-600 font-bold">
                <span>Start ordering</span>
                <span className="ml-2">→</span>
              </div>
            </div>
          </Link>

          {/* Saved Addresses Module */}
          <Link href="/addresses">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer border-4 border-yellow-400 hover:border-yellow-500">
              <div className="text-5xl mb-4">📍</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Saved Addresses
              </h2>
              <p className="text-gray-600 mb-4">
                Manage your delivery addresses
              </p>
              <div className="inline-block bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded mb-2 font-semibold">
                ✨ Quick Access
              </div>
              <div className="flex items-center text-yellow-600 font-bold">
                <span>View addresses</span>
                <span className="ml-2">→</span>
              </div>
            </div>
          </Link>

          {/* Delivery Agent Module */}
          <Link href="/agent">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer border-4 border-yellow-400 hover:border-yellow-500">
              <div className="text-5xl mb-4">🚗</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Delivery Partner
              </h2>
              <p className="text-gray-600 mb-4">
                Agent app - Accept orders & navigate with GPS
              </p>
              <div className="flex items-center text-yellow-600 font-bold">
                <span>Start delivering</span>
                <span className="ml-2">→</span>
              </div>
            </div>
          </Link>

          {/* Demo Module */}
          <Link href="/demo">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer border-4 border-yellow-400 hover:border-yellow-500">
              <div className="text-5xl mb-4">🧪</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Demo & Testing
              </h2>
              <p className="text-gray-600 mb-4">
                Test module - Simulate deliveries in real-time
              </p>
              <div className="flex items-center text-yellow-600 font-bold">
                <span>Start testing</span>
                <span className="ml-2">→</span>
              </div>
            </div>
          </Link>

          {/* Order History */}
          <Link href="/history">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer border-4 border-yellow-400 hover:border-yellow-500">
              <div className="text-5xl mb-4">📜</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Order History
              </h2>
              <p className="text-gray-600 mb-4">
                View your past deliveries and reorder
              </p>
              <div className="flex items-center text-yellow-600 font-bold">
                <span>View orders</span>
                <span className="ml-2">→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border-4 border-yellow-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            ✨ Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <span className="text-3xl">⚡</span>
              <div>
                <h3 className="font-bold text-gray-800">Real-Time WebSocket</h3>
                <p className="text-sm text-gray-600">Instant location updates</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-3xl">🔄</span>
              <div>
                <h3 className="font-bold text-gray-800">Polling Fallback</h3>
                <p className="text-sm text-gray-600">Works even offline</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-3xl">🗺️</span>
              <div>
                <h3 className="font-bold text-gray-800">Google Maps</h3>
                <p className="text-sm text-gray-600">Smooth animations</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-3xl">📍</span>
              <div>
                <h3 className="font-bold text-gray-800">Shortest Path</h3>
                <p className="text-sm text-gray-600">Optimized routing</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-3xl">⏱️</span>
              <div>
                <h3 className="font-bold text-gray-800">Dynamic ETA</h3>
                <p className="text-sm text-gray-600">Accurate predictions</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-3xl">🔐</span>
              <div>
                <h3 className="font-bold text-gray-800">Redis + MongoDB</h3>
                <p className="text-sm text-gray-600">Fast & reliable</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl shadow-lg p-6 text-black border-4 border-black">
            <h3 className="text-xl font-bold mb-3">🎯 For Users</h3>
            <ul className="space-y-2 text-sm">
              <li>✓ Select pickup & drop on map</li>
              <li>✓ Use current location</li>
              <li>✓ Track delivery in real-time</li>
              <li>✓ Get accurate ETA</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl shadow-lg p-6 text-black border-4 border-black">
            <h3 className="text-xl font-bold mb-3">🚗 For Delivery Partners</h3>
            <ul className="space-y-2 text-sm">
              <li>✓ Accept orders easily</li>
              <li>✓ GPS-guided navigation</li>
              <li>✓ Shortest path routing</li>
              <li>✓ Real-time updates</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600">
          <p className="text-sm">
            Built with Next.js 14, React 18, TypeScript, Tailwind CSS, Socket.IO, Redis & MongoDB
          </p>
          <p className="text-xs mt-2 text-gray-500">
            Powered by Google Maps API • Production Ready • Real-Time Tracking
          </p>
        </div>
      </div>
    </div>
  );
}
