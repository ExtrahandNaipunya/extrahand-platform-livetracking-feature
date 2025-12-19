# API Documentation

Complete API reference for the ExtraHand Live Tracking platform.

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

Currently, the platform uses `WEBSOCKET_SECRET` for WebSocket authentication. For production, implement proper API authentication (JWT, API keys, etc.).

---

## Endpoints

### 1. Initialize Task

Create a new tracking task with pickup, destination, and driver information.

**Endpoint**: `POST /api/task/init`

**Request Body**:
```json
{
  "taskId": "string (required, unique)",
  "pickup": {
    "lat": "number (required, -90 to 90)",
    "lng": "number (required, -180 to 180)",
    "address": "string (optional)"
  },
  "destination": {
    "lat": "number (required, -90 to 90)",
    "lng": "number (required, -180 to 180)",
    "address": "string (optional)"
  },
  "driver": {
    "id": "string (required)",
    "name": "string (required)",
    "phone": "string (required)",
    "vehicleNumber": "string (optional)",
    "rating": "number (optional, 0-5)"
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Task initialized successfully",
  "data": {
    "taskId": "task_123",
    "trackingUrl": "/track/task_123"
  }
}
```

**Error Responses**:
- `400`: Missing or invalid fields
- `500`: Internal server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/task/init \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "delivery_001",
    "pickup": {
      "lat": 17.385044,
      "lng": 78.486671,
      "address": "Hitech City, Hyderabad"
    },
    "destination": {
      "lat": 17.440826,
      "lng": 78.348449,
      "address": "Gachibowli, Hyderabad"
    },
    "driver": {
      "id": "driver_123",
      "name": "Rajesh Kumar",
      "phone": "+91-9876543210",
      "vehicleNumber": "TS09 AB 1234",
      "rating": 4.8
    }
  }'
```

---

### 2. Update Driver Location

Update the driver's current location for a task. This triggers real-time updates to all connected clients.

**Endpoint**: `POST /api/driver/update`

**Request Body**:
```json
{
  "taskId": "string (required)",
  "driverId": "string (required)",
  "lat": "number (required, -90 to 90)",
  "lng": "number (required, -180 to 180)",
  "speed": "number (optional, km/h)",
  "timestamp": "number (required, Unix timestamp in milliseconds)"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "status": "ON_THE_WAY",
    "eta": "12 mins",
    "distance": 4.8
  }
}
```

**Status Values**:
- `PICKED_UP`: Initial status
- `ON_THE_WAY`: Driver is en route
- `ARRIVING`: Less than 500m from destination
- `COMPLETED`: Delivery complete
- `CANCELLED`: Delivery cancelled

**Error Responses**:
- `400`: Validation failed
- `404`: Task not found
- `500`: Internal server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/driver/update \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "delivery_001",
    "driverId": "driver_123",
    "lat": 17.395000,
    "lng": 78.475000,
    "speed": 40,
    "timestamp": 1703001234567
  }'
```

**Behavior**:
- Calculates ETA using Google Distance Matrix API (with Haversine fallback)
- Determines status based on distance to destination
- Stores location in Redis (live state)
- Publishes update to WebSocket subscribers
- Archives location in MongoDB (async, non-blocking)

---

### 3. Get Live Location

Retrieve the current live location data for a task. Used as polling fallback when WebSocket is unavailable.

**Endpoint**: `GET /api/task/{taskId}/live`

**Path Parameters**:
- `taskId`: The unique task identifier

**Success Response** (200):
```json
{
  "lat": 17.395000,
  "lng": 78.475000,
  "eta": "12 mins",
  "status": "ON_THE_WAY",
  "driver": {
    "id": "driver_123",
    "name": "Rajesh Kumar",
    "phone": "+91-9876543210",
    "vehicleNumber": "TS09 AB 1234",
    "rating": 4.8
  },
  "pickup": {
    "lat": 17.385044,
    "lng": 78.486671
  },
  "destination": {
    "lat": 17.440826,
    "lng": 78.348449
  },
  "distance": 4.8,
  "duration": 720,
  "timestamp": 1703001234567
}
```

**Error Responses**:
- `400`: Task ID is required
- `404`: No live tracking data available or task not found
- `500`: Internal server error

**Example**:
```bash
curl -X GET http://localhost:3000/api/task/delivery_001/live
```

**Usage**:
- Called automatically by the frontend every 3-5 seconds when WebSocket is disconnected
- Can be used by third-party integrations
- Returns cached data from Redis

---

### 4. Get Task Initialization Example

Get an example payload for task initialization.

**Endpoint**: `GET /api/task/init`

**Success Response** (200):
```json
{
  "message": "Use POST request with the following payload to initialize a task",
  "example": {
    "taskId": "task_1703001234567",
    "pickup": {
      "lat": 17.385044,
      "lng": 78.486671,
      "address": "Hitech City, Hyderabad"
    },
    "destination": {
      "lat": 17.440826,
      "lng": 78.348449,
      "address": "Gachibowli, Hyderabad"
    },
    "driver": {
      "id": "driver_001",
      "name": "Rajesh Kumar",
      "phone": "+91-9876543210",
      "vehicleNumber": "TS09 AB 1234",
      "rating": 4.8
    }
  }
}
```

---

## WebSocket API

### Connection

Connect to WebSocket server:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
});
```

### Events

#### Client → Server

**subscribe**
Subscribe to task updates:
```javascript
socket.emit('subscribe', taskId);
```

**unsubscribe**
Unsubscribe from task updates:
```javascript
socket.emit('unsubscribe', taskId);
```

#### Server → Client

**connect**
Emitted when connection is established:
```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

**location_update**
Emitted when driver location is updated:
```javascript
socket.on('location_update', (data) => {
  console.log('Location update:', data);
  // data structure matches /api/driver/update response
});
```

**disconnect**
Emitted when connection is lost:
```javascript
socket.on('disconnect', () => {
  console.log('Disconnected');
  // Frontend automatically falls back to polling
});
```

**error**
Emitted on error:
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

---

## Rate Limits

Current implementation has no rate limits. For production, add rate limiting middleware:

**Recommended limits**:
- `/api/task/init`: 10 requests/minute per IP
- `/api/driver/update`: 60 requests/minute per task
- `/api/task/[taskId]/live`: 20 requests/minute per task

---

## Data Models

### Location
```typescript
{
  lat: number;  // Latitude (-90 to 90)
  lng: number;  // Longitude (-180 to 180)
}
```

### DriverInfo
```typescript
{
  id: string;
  name: string;
  phone: string;
  vehicleNumber?: string;
  rating?: number;  // 0-5
}
```

### TaskStatus
```typescript
type TaskStatus = 
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'ARRIVING'
  | 'COMPLETED'
  | 'CANCELLED';
```

### TrackingData
```typescript
{
  taskId: string;
  pickup: Location;
  destination: Location;
  currentLocation: Location;
  status: TaskStatus;
  eta: string;  // e.g., "12 mins"
  driver: DriverInfo;
  route?: Array<{lat: number, lng: number}>;
  distance?: number;  // kilometers
  duration?: number;  // seconds
}
```

---

## Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 400 | Bad Request | Invalid input data |
| 404 | Not Found | Task doesn't exist |
| 500 | Internal Server Error | Server or database issue |

**Error Response Format**:
```json
{
  "error": "Error message here",
  "details": []  // Optional validation details
}
```

---

## Best Practices

### 1. Task Initialization
- Initialize task before driver starts
- Use unique task IDs (e.g., order ID)
- Include all driver information upfront

### 2. Location Updates
- Send updates every 5-10 seconds while moving
- Include accurate timestamps
- Provide speed when available (improves ETA)

### 3. Error Handling
- Always check response status
- Implement retry logic for failed updates
- Fall back to polling if WebSocket fails

### 4. Performance
- Batch location updates if needed
- Cache task data on client side
- Use WebSocket for real-time updates

---

## Integration Examples

### JavaScript/TypeScript
```typescript
// Initialize task
const initTask = async () => {
  const response = await fetch('/api/task/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: 'order_123',
      pickup: { lat: 17.385044, lng: 78.486671 },
      destination: { lat: 17.440826, lng: 78.348449 },
      driver: {
        id: 'driver_001',
        name: 'John Doe',
        phone: '+1234567890'
      }
    })
  });
  return response.json();
};

// Update location
const updateLocation = async (lat: number, lng: number) => {
  const response = await fetch('/api/driver/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: 'order_123',
      driverId: 'driver_001',
      lat,
      lng,
      speed: 40,
      timestamp: Date.now()
    })
  });
  return response.json();
};
```

### Python
```python
import requests
import time

# Initialize task
def init_task():
    url = "http://localhost:3000/api/task/init"
    data = {
        "taskId": "order_123",
        "pickup": {"lat": 17.385044, "lng": 78.486671},
        "destination": {"lat": 17.440826, "lng": 78.348449},
        "driver": {
            "id": "driver_001",
            "name": "John Doe",
            "phone": "+1234567890"
        }
    }
    response = requests.post(url, json=data)
    return response.json()

# Update location
def update_location(lat, lng):
    url = "http://localhost:3000/api/driver/update"
    data = {
        "taskId": "order_123",
        "driverId": "driver_001",
        "lat": lat,
        "lng": lng,
        "speed": 40,
        "timestamp": int(time.time() * 1000)
    }
    response = requests.post(url, json=data)
    return response.json()
```

### cURL
```bash
# Initialize
curl -X POST http://localhost:3000/api/task/init \
  -H "Content-Type: application/json" \
  -d '{"taskId":"order_123","pickup":{"lat":17.385044,"lng":78.486671},"destination":{"lat":17.440826,"lng":78.348449},"driver":{"id":"driver_001","name":"John Doe","phone":"+1234567890"}}'

# Update
curl -X POST http://localhost:3000/api/driver/update \
  -H "Content-Type: application/json" \
  -d '{"taskId":"order_123","driverId":"driver_001","lat":17.390000,"lng":78.480000,"speed":40,"timestamp":'$(date +%s000)'}'

# Get status
curl http://localhost:3000/api/task/order_123/live
```

---

## Webhooks (Future Enhancement)

Not currently implemented, but recommended for production:

```json
POST https://your-server.com/webhook/tracking
{
  "event": "status_changed",
  "taskId": "order_123",
  "status": "ARRIVING",
  "timestamp": 1703001234567
}
```

---

For more details, see [README.md](./README.md) and [QUICKSTART.md](./QUICKSTART.md).
