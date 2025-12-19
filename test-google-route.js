require('dotenv').config();

async function testGoogleRoute() {
  const apiKey = process.env.GOOGLE_DISTANCE_MATRIX_KEY;
  
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
  
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.append('origin', '17.385044,78.486671');
  url.searchParams.append('destination', '17.440826,78.348449');
  url.searchParams.append('mode', 'driving');
  url.searchParams.append('key', apiKey);

  console.log('\nRequest URL:', url.toString().replace(apiKey, 'API_KEY'));
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('\nAPI Response Status:', data.status);
    console.log('Error Message:', data.error_message || 'None');
    
    if (data.status === 'OK' && data.routes.length > 0) {
      console.log('✅ Route found successfully!');
      console.log('Route points:', data.routes[0].overview_polyline.points.substring(0, 50) + '...');
    } else {
      console.log('❌ Failed to get route');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGoogleRoute();
