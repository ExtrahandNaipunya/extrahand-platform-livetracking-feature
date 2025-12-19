/**
 * API Testing Examples
 * 
 * Use these curl commands to test the platform
 */

// 1. Initialize a task
const initTask = `
curl -X POST http://localhost:3000/api/task/init \\
  -H "Content-Type: application/json" \\
  -d '{
    "taskId": "demo-task-123",
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
  }'
`;

// 2. Update driver location (simulate movement)
const updateLocation1 = `
curl -X POST http://localhost:3000/api/driver/update \\
  -H "Content-Type: application/json" \\
  -d '{
    "taskId": "demo-task-123",
    "driverId": "driver_001",
    "lat": 17.390000,
    "lng": 78.480000,
    "speed": 40,
    "timestamp": '$(date +%s000)'
  }'
`;

const updateLocation2 = `
curl -X POST http://localhost:3000/api/driver/update \\
  -H "Content-Type: application/json" \\
  -d '{
    "taskId": "demo-task-123",
    "driverId": "driver_001",
    "lat": 17.400000,
    "lng": 78.470000,
    "speed": 45,
    "timestamp": '$(date +%s000)'
  }'
`;

const updateLocation3 = `
curl -X POST http://localhost:3000/api/driver/update \\
  -H "Content-Type: application/json" \\
  -d '{
    "taskId": "demo-task-123",
    "driverId": "driver_001",
    "lat": 17.420000,
    "lng": 78.360000,
    "speed": 35,
    "timestamp": '$(date +%s000)'
  }'
`;

// 3. Get live location (polling endpoint)
const getLiveLocation = `
curl -X GET http://localhost:3000/api/task/demo-task-123/live
`;

// 4. Test workflow
console.log('=== ExtraHand Live Tracking - API Test Examples ===\n');
console.log('Step 1: Initialize Task');
console.log(initTask);
console.log('\nStep 2: Visit tracking page');
console.log('http://localhost:3000/track/demo-task-123');
console.log('\nStep 3: Update driver location (run multiple times)');
console.log(updateLocation1);
console.log('\nStep 4: Continue updating location');
console.log(updateLocation2);
console.log('\nStep 5: Near destination');
console.log(updateLocation3);
console.log('\nStep 6: Check polling endpoint');
console.log(getLiveLocation);
