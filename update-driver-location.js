const axios = require('axios');

async function updateDriverLocation() {
  try {
    // Starting position (near pickup location)
    const response = await axios.post('http://localhost:3000/api/driver/update', {
      taskId: 'demo-task-123',
      driverId: 'driver_001',
      lat: 17.385044,  // Hitech City
      lng: 78.486671,
      speed: 30,
      timestamp: Date.now()
    });
    
    console.log('✅ Driver location updated successfully:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error updating driver location:', error.response?.data || error.message);
  }
}

updateDriverLocation();
