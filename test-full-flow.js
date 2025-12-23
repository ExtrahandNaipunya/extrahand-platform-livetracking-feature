/**
 * END-TO-END TESTING SCRIPT
 * Tests complete order flow from creation to delivery
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let orderId = null;
let otp = null;

// Colors for console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(status, message) {
  const timestamp = new Date().toLocaleTimeString();
  const color = status === '✅' ? colors.green : status === '❌' ? colors.red : colors.yellow;
  console.log(`${color}${status}${colors.reset} [${timestamp}] ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Create Order
async function testCreateOrder() {
  log('🧪', 'TEST 1: Creating order...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/order/create`, {
      taskId: `order_${Date.now()}`,
      item: 'Test Pizza Delivery',
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
        phone: '+919876543210'
      }
    });

    if (response.data.success) {
      orderId = response.data.data.taskId;
      otp = response.data.data.deliveryOTP;
      log('✅', `Order created: ${orderId}`);
      log('🔐', `OTP generated: ${otp}`);
      return true;
    }
  } catch (error) {
    log('❌', `Create order failed: ${error.message}`);
    return false;
  }
}

// Test 2: Check Pending Orders
async function testPendingOrders() {
  log('🧪', 'TEST 2: Checking pending orders...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/agent/pending-orders`);
    
    if (response.data.success && response.data.orders.length > 0) {
      log('✅', `Found ${response.data.orders.length} pending order(s)`);
      return true;
    } else {
      log('⚠️', 'No pending orders found');
      return false;
    }
  } catch (error) {
    log('❌', `Pending orders check failed: ${error.message}`);
    return false;
  }
}

// Test 3: Agent Accepts Order
async function testAcceptOrder() {
  log('🧪', 'TEST 3: Agent accepting order...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/agent/accept-order`, {
      taskId: orderId,
      agentId: 'agent_test_123',
      agentName: 'Test Driver',
      agentPhone: '+919999999999'
    });

    if (response.data.success) {
      log('✅', 'Order accepted by agent');
      return true;
    }
  } catch (error) {
    log('❌', `Accept order failed: ${error.message}`);
    return false;
  }
}

// Test 4: Update Driver Location
async function testDriverUpdate() {
  log('🧪', 'TEST 4: Updating driver location...');
  
  const locations = [
    { lat: 17.385044, lng: 78.486671, desc: 'At pickup' },
    { lat: 17.400000, lng: 78.470000, desc: 'En route' },
    { lat: 17.440826, lng: 78.348449, desc: 'At destination' }
  ];

  for (const loc of locations) {
    try {
      const response = await axios.post(`${BASE_URL}/api/driver/update`, {
        taskId: orderId,
        driverId: 'agent_test_123',
        lat: loc.lat,
        lng: loc.lng,
        speed: 40,
        timestamp: Date.now()
      });

      if (response.data.success) {
        log('✅', `Location updated: ${loc.desc} (ETA: ${response.data.data.eta})`);
        await sleep(2000); // Wait 2s between updates
      }
    } catch (error) {
      log('❌', `Driver update failed: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

// Test 5: Check Live Tracking
async function testLiveTracking() {
  log('🧪', 'TEST 5: Checking live tracking...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/task/${orderId}/live`);
    
    if (response.data.lat && response.data.lng) {
      log('✅', `Live tracking working (Status: ${response.data.status}, ETA: ${response.data.eta})`);
      log('📍', `Current location: ${response.data.lat.toFixed(4)}, ${response.data.lng.toFixed(4)}`);
      return true;
    }
  } catch (error) {
    log('❌', `Live tracking failed: ${error.message}`);
    return false;
  }
}

// Test 6: Complete Delivery
async function testCompleteDelivery() {
  log('🧪', 'TEST 6: Completing delivery with OTP...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/delivery/complete`, {
      taskId: orderId,
      otp: otp,
      proofOfDelivery: {
        photoUrl: 'data:image/png;base64,test',
        signatureUrl: 'data:image/png;base64,test',
        recipientName: 'Test Customer',
        notes: 'Test delivery completed'
      }
    });

    if (response.data.success) {
      log('✅', 'Delivery completed successfully');
      return true;
    }
  } catch (error) {
    log('❌', `Complete delivery failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 EXTRAHAND MAPS - END-TO-END TESTING');
  console.log('='.repeat(60) + '\n');

  log('📋', 'Starting test suite...\n');

  const results = {
    total: 6,
    passed: 0,
    failed: 0
  };

  // Run tests sequentially
  if (await testCreateOrder()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testPendingOrders()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testAcceptOrder()) results.passed++; else results.failed++;
  await sleep(2000);
  
  if (await testDriverUpdate()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testLiveTracking()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testCompleteDelivery()) results.passed++; else results.failed++;

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`${colors.green}✅ Passed: ${results.passed}/${results.total}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${results.failed}/${results.total}${colors.reset}`);
  console.log(`${colors.blue}📦 Order ID: ${orderId}${colors.reset}`);
  console.log(`${colors.blue}🔐 OTP: ${otp}${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  if (results.failed === 0) {
    log('🎉', 'ALL TESTS PASSED! System working perfectly.');
  } else {
    log('⚠️', `${results.failed} test(s) failed. Check logs above.`);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log('❌', `Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run tests
runAllTests().catch(console.error);
