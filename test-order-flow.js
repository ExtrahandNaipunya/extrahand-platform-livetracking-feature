const axios = require('axios');

async function createTestOrder() {
  try {
    const taskId = `order_${Date.now()}`;
    
    const response = await axios.post('http://localhost:3000/api/order/create', {
      taskId: taskId,
      item: 'Test Groceries',
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
      customer: {
        name: 'Test Customer',
        phone: '+91-9999999999'
      }
    });
    
    console.log('✅ Order created successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n📍 Tracking URL: http://localhost:3000' + response.data.data.trackingUrl);
    
    // Test if tracking data is available
    console.log('\n🔍 Testing tracking endpoint...');
    const trackingResponse = await axios.get(`http://localhost:3000/api/task/${taskId}/live`);
    console.log('✅ Tracking data available:');
    console.log('  Status:', trackingResponse.data.status);
    console.log('  ETA:', trackingResponse.data.eta);
    console.log('  Location:', trackingResponse.data.lat, trackingResponse.data.lng);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

createTestOrder();
