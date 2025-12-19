# Quick Start Guide

Get the ExtraHand Live Tracking platform running in 5 minutes!

## 🚀 Fast Setup (3 Steps)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Create `.env.local` file:

```bash
cp .env.example .env.local
```

**Minimum required variables** (for testing):

```env
# For maps to work (required)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_key

# For Redis (get free tier at upstash.com)
REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token

# For MongoDB (get free tier at mongodb.com/cloud/atlas)
MONGODB_URI=your_mongodb_connection_string

# For WebSocket
WEBSOCKET_SECRET=any_random_secret_key_here
```

### Step 3: Run

```bash
npm run dev
```

Visit **http://localhost:3000**

---

## 📝 Testing the Platform

### Initialize a Test Task

```bash
curl -X POST http://localhost:3000/api/task/init \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test-123",
    "pickup": {"lat": 17.385044, "lng": 78.486671},
    "destination": {"lat": 17.440826, "lng": 78.348449},
    "driver": {
      "id": "driver_001",
      "name": "Test Driver",
      "phone": "+1234567890"
    }
  }'
```

### View Live Tracking

Visit: **http://localhost:3000/track/test-123**

### Simulate Driver Movement

```bash
# Update 1
curl -X POST http://localhost:3000/api/driver/update \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test-123",
    "driverId": "driver_001",
    "lat": 17.390000,
    "lng": 78.480000,
    "speed": 40,
    "timestamp": '$(date +%s000)'
  }'

# Update 2 (closer to destination)
curl -X POST http://localhost:3000/api/driver/update \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test-123",
    "driverId": "driver_001",
    "lat": 17.420000,
    "lng": 78.360000,
    "speed": 35,
    "timestamp": '$(date +%s000)'
  }'
```

Watch the map update in real-time! 🎉

---

## 🔑 Getting API Keys

### Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable these APIs:
   - Maps JavaScript API
   - Distance Matrix API
   - Directions API
4. Create credentials → API Key
5. Copy key to `NEXT_PUBLIC_GOOGLE_MAPS_KEY`

### Upstash Redis (Free)

1. Visit [upstash.com](https://upstash.com)
2. Sign up (free)
3. Create Redis database
4. Copy REST URL → `REDIS_URL`
5. Copy REST Token → `REDIS_TOKEN`

### MongoDB Atlas (Free)

1. Visit [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up (free)
3. Create cluster (M0 free tier)
4. Create database user
5. Get connection string → `MONGODB_URI`

---

## 📱 What You'll See

### Customer View (`/track/[taskId]`)
- 🗺️ **Live Map**: Shows pickup, destination, and moving driver
- ⏱️ **Real-time ETA**: Updates automatically
- 📍 **Status**: PICKED_UP → ON_THE_WAY → ARRIVING → COMPLETED
- 👤 **Driver Info**: Name, phone, vehicle, rating
- 🔄 **Live Updates**: Via WebSocket or polling fallback

### Features in Action
- ✅ Smooth marker animation (no jumping)
- ✅ Route polyline display
- ✅ Automatic reconnection
- ✅ Mobile responsive
- ✅ Professional UI

---

## 🛠️ Available Scripts

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# View test API commands
npm run test-api
```

---

## 🐛 Troubleshooting

### Map not loading?
- Check `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set correctly
- Verify APIs are enabled in Google Cloud Console

### Location updates not showing?
- Ensure Redis is configured
- Check browser console for errors
- Verify task was initialized via `/api/task/init`

### WebSocket not connecting?
- System automatically falls back to polling
- Check console for connection status
- Polling works without WebSocket

---

## 📚 Next Steps

- Read [README.md](./README.md) for full documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting options
- See [test-api.js](./test-api.js) for more API examples

---

## 🎉 You're Ready!

The platform is now running. Start tracking deliveries in real-time!

**Need help?** Check the full README or create an issue.

---

**Built with**: Next.js • React • TypeScript • Tailwind • Socket.IO • Redis • MongoDB
