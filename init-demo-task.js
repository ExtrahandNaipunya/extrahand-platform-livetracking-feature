const axios = require('axios');

async function initDemoTask() {
  try {
    const response = await axios.post('http://localhost:3000/api/task/init', {
      taskId: 'demo-task-123',
      pickup: {
        lat: 17.385044,
        lng: 78.486671,
        address: 'Hitech City, Hyderabad'
      },
      destination: {
        lat: 17.440826,
        lng: 78.348449,
        address: 'Gachibowli, Hyderabad'
      },
      driver: {
        id: 'driver_001',
        name: 'Rajesh Kumar',
        phone: '+91-9876543210',
        vehicleNumber: 'TS09 AB 1234',
        rating: 4.8
      }
    });
    
    console.log('✅ Task initialized successfully:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error initializing task:', error.response?.data || error.message);
  }
}

initDemoTask();
