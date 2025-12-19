# System Architecture

Complete technical architecture of the ExtraHand Live Tracking Platform.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Customer Interface                         │
│                     (Browser - React App)                         │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Live Map     │  │ Status Panel │  │    Driver Card       │ │
│  │  (Google Maps) │  │   (ETA)      │  │ (Contact Info)       │ │
│  └────────────────┘  └──────────────┘  └──────────────────────┘ │
└────────────┬──────────────────────────────────────────┬──────────┘
             │                                           │
             │ WebSocket (Primary)                      │ HTTP Polling
             │ Real-time Updates                        │ (Fallback)
             ▼                                           ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Next.js Application Server                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Socket.IO WebSocket Server                 │ │
│  │  • Room-based subscriptions (task:${taskId})                 │ │
│  │  • Auto-reconnection logic                                   │ │
│  │  • Fallback to polling on failure                            │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                      REST API Routes                          │ │
│  │  • POST /api/task/init        - Initialize tracking          │ │
│  │  • POST /api/driver/update    - Update location              │ │
│  │  • GET  /api/task/[id]/live   - Get current status           │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────┬────────────────────────────┬────────────────────────┬────────┘
      │                            │                        │
      │ Store/Retrieve             │ Calculate              │ Audit
      ▼                            ▼                        ▼
┌─────────────┐          ┌─────────────────┐      ┌──────────────┐
│    Redis    │          │  Google Maps    │      │   MongoDB    │
│  (Upstash)  │          │      APIs       │      │   (Atlas)    │
├─────────────┤          ├─────────────────┤      ├──────────────┤
│ • Live data │          │ • Distance      │      │ • Location   │
│ • Task info │          │   Matrix API    │      │   history    │
│ • ETA cache │          │ • Directions    │      │ • Completed  │
│ • Routes    │          │   API           │      │   tasks      │
│ • Pub/Sub   │          │ • Maps JS API   │      │ • Analytics  │
└─────────────┘          └─────────────────┘      └──────────────┘
      ▲                                                    
      │                                                    
      │ Updates every 5-10s                               
      │                                                    
┌─────┴──────────────────────────────────────────────────┐
│              Driver Application                         │
│         (Mobile App / GPS Device)                       │
│  • Sends location updates via POST /driver/update      │
│  • Includes: lat, lng, speed, timestamp                │
└────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

### 1. Task Initialization Flow

```
Driver App          API Server         Redis           MongoDB
    │                   │                │                │
    │  POST /task/init  │                │                │
    ├──────────────────►│                │                │
    │                   │  Store task    │                │
    │                   ├───────────────►│                │
    │                   │                │                │
    │                   │    Success     │                │
    │   Response + URL  │◄───────────────┤                │
    │◄──────────────────┤                │                │
    │                   │                │                │
```

### 2. Location Update Flow

```
Driver App          API Server         Redis        Google APIs    WebSocket     MongoDB
    │                   │                │               │             │            │
    │  POST /driver/    │                │               │             │            │
    │      update       │                │               │             │            │
    ├──────────────────►│                │               │             │            │
    │                   │  Get task data │               │             │            │
    │                   ├───────────────►│               │             │            │
    │                   │◄───────────────┤               │             │            │
    │                   │                │               │             │            │
    │                   │  Calculate ETA │               │             │            │
    │                   ├───────────────────────────────►│             │            │
    │                   │◄───────────────────────────────┤             │            │
    │                   │                │               │             │            │
    │                   │  Store latest  │               │             │            │
    │                   ├───────────────►│               │             │            │
    │                   │                │               │             │            │
    │                   │  Broadcast update              │             │            │
    │                   ├───────────────────────────────────────────►│            │
    │                   │                │               │             │            │
    │                   │  Archive (async)               │             │            │
    │                   ├───────────────────────────────────────────────────────►│
    │                   │                │               │             │            │
    │   Success         │                │               │             │            │
    │◄──────────────────┤                │               │             │            │
    │                   │                │               │             │            │
```

### 3. Customer Tracking Flow (WebSocket)

```
Customer Browser    API Server      WebSocket Server    Redis
    │                   │                   │              │
    │  Load /track/[id] │                   │              │
    ├──────────────────►│                   │              │
    │                   │  Get task data    │              │
    │                   ├──────────────────────────────────►│
    │                   │◄──────────────────────────────────┤
    │  Initial data     │                   │              │
    │◄──────────────────┤                   │              │
    │                   │                   │              │
    │  Connect WS       │                   │              │
    ├──────────────────────────────────────►│              │
    │                   │                   │              │
    │  Subscribe(taskId)│                   │              │
    ├──────────────────────────────────────►│              │
    │                   │                   │  Get latest  │
    │                   │                   ├─────────────►│
    │                   │                   │◄─────────────┤
    │  location_update  │                   │              │
    │◄──────────────────────────────────────┤              │
    │                   │                   │              │
    │     (Real-time updates continue)      │              │
    │◄──────────────────────────────────────┤              │
    │                   │                   │              │
```

### 4. Polling Fallback Flow

```
Customer Browser    API Server         Redis
    │                   │                │
    │  (WS disconnects) │                │
    │                   │                │
    │  GET /task/[id]/  │                │
    │      live         │                │
    ├──────────────────►│                │
    │                   │  Get latest    │
    │                   ├───────────────►│
    │                   │◄───────────────┤
    │  Current location │                │
    │◄──────────────────┤                │
    │                   │                │
    │  (Repeat every 3-5 seconds)        │
    │                   │                │
```

## Component Architecture

### Frontend Components

```
app/track/[taskId]/page.tsx (Main Page)
    │
    ├── LiveMap.tsx
    │   ├── Google Maps API
    │   ├── Marker Components
    │   │   ├── Pickup Marker (Green)
    │   │   ├── Destination Marker (Red)
    │   │   └── Driver Marker (Blue, Animated)
    │   └── Polyline (Route)
    │
    ├── StatusPanel.tsx
    │   ├── Status Badge
    │   ├── ETA Display
    │   ├── Distance Display
    │   └── Progress Bar
    │
    └── DriverCard.tsx
        ├── Driver Avatar
        ├── Contact Info
        ├── Rating Display
        └── Action Buttons
```

### State Management

```
useTrackingStore (Zustand)
    │
    ├── trackingData
    │   ├── taskId
    │   ├── pickup
    │   ├── destination
    │   ├── currentLocation
    │   ├── status
    │   ├── eta
    │   └── driver
    │
    ├── isConnected (WebSocket status)
    ├── isLoading
    ├── error
    │
    └── Actions
        ├── setTrackingData()
        ├── updateLocation()
        ├── updateETA()
        ├── updateStatus()
        └── setConnected()
```

### Custom Hooks

```
useSocket(taskId)
    │
    ├── WebSocket Logic
    │   ├── Connect to Socket.IO
    │   ├── Subscribe to task channel
    │   ├── Handle location_update events
    │   ├── Auto-reconnection (5 attempts)
    │   └── Emit subscribe/unsubscribe
    │
    └── Polling Fallback
        ├── Start polling on WS disconnect
        ├── Fetch /api/task/[id]/live every 3s
        ├── Stop polling on WS reconnect
        └── Update store with latest data
```

## Database Schemas

### Redis Keys

```
task:{taskId}:location     → Current location data
task:{taskId}:data         → Task metadata (pickup, destination, driver)
task:{taskId}:eta          → Cached ETA result
task:{taskId}:route        → Cached route polyline
driver:{driverId}:location → Driver's latest location
```

### MongoDB Collections

```
location_history
{
  _id: ObjectId,
  taskId: string,
  driverId: string,
  lat: number,
  lng: number,
  speed: number,
  timestamp: number,
  status: string,
  createdAt: Date
}

completed_tasks
{
  _id: ObjectId,
  taskId: string,
  driverId: string,
  completedAt: Date,
  totalDistance: number,
  totalDuration: number,
  createdAt: Date
}
```

## Algorithm Details

### ETA Calculation

```
1. Try Google Distance Matrix API
   ├─ Cache result for 5 minutes
   ├─ Returns: duration in seconds, distance in meters
   └─ Format as human-readable (e.g., "12 mins")

2. On failure/quota exceeded:
   ├─ Calculate Haversine distance
   ├─ Use provided speed or default (40 km/h)
   ├─ duration = distance / speed
   └─ Format result
```

### Location Smoothing

```
1. Linear Interpolation (LERP)
   ├─ Start location: previous position
   ├─ End location: new position
   ├─ Progress: 0 → 1 over 1 second
   └─ Smooth transition = start + (end - start) * progress

2. Bearing Calculation
   ├─ atan2(lng_diff, lat_diff)
   ├─ Convert to degrees
   └─ Rotate marker icon

3. Optional: Kalman Filter
   ├─ Reduce GPS jitter
   ├─ Predict next position
   └─ Smooth velocity changes
```

### Status Determination

```
distance = haversine(currentLocation, destination)

if distance < 0.5 km:
    status = "ARRIVING"
else if distance < destination threshold:
    status = "ON_THE_WAY"
else:
    status = "PICKED_UP"
```

## Performance Optimizations

### 1. Caching Strategy

- **ETA Cache**: 5 minutes
- **Route Cache**: 30 minutes
- **Task Data**: 2 hours
- **Location**: 1 hour

### 2. API Cost Reduction

- Use Haversine fallback for quota management
- Cache Google API responses
- Batch requests when possible

### 3. Real-time Efficiency

- Redis pub/sub for instant updates
- WebSocket rooms for targeted broadcasting
- Connection pooling for databases

### 4. Frontend Optimization

- LERP for smooth animations (60 FPS)
- Lazy loading for maps
- Debounced updates
- Optimistic UI updates

## Security Considerations

### Current Implementation

- Environment variable protection
- Input validation with Zod
- CORS configuration
- WebSocket authentication ready

### Production Recommendations

1. Add JWT authentication
2. Implement rate limiting
3. Use HTTPS only
4. Restrict API keys by domain
5. Add request signing
6. Implement API versioning

## Scalability

### Horizontal Scaling

```
Load Balancer
    │
    ├── Next.js Instance 1 ─┐
    ├── Next.js Instance 2 ─┼── Redis Cluster
    ├── Next.js Instance 3 ─┘
    │
    └── Sticky Sessions (for WebSocket)
```

### Vertical Scaling

- Increase server resources
- Optimize Node.js memory
- Use clustering

### Database Scaling

- Redis Cluster for high availability
- MongoDB sharding for large datasets
- Read replicas for analytics

## Monitoring & Observability

### Key Metrics to Track

1. **WebSocket Metrics**
   - Active connections
   - Connection duration
   - Reconnection rate

2. **API Metrics**
   - Request rate
   - Response time
   - Error rate

3. **Business Metrics**
   - Active tasks
   - Average ETA accuracy
   - Location update frequency

### Recommended Tools

- **Error Tracking**: Sentry
- **Performance**: New Relic / Datadog
- **Logs**: Papertrail / CloudWatch
- **Uptime**: UptimeRobot

## Disaster Recovery

### Data Loss Prevention

- Redis persistence enabled
- MongoDB automated backups
- Location history in MongoDB

### Failover Strategy

1. WebSocket → Polling (automatic)
2. Google API → Haversine (automatic)
3. Redis down → MongoDB fallback (implement if needed)

---

This architecture supports **thousands of concurrent tracking sessions** with real-time updates and automatic failover mechanisms.
