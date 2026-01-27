
const axios = require('axios');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendUpdate(label, data) {
    try {
        console.log(`\n--- Sending ${label} ---`);
        const response = await axios.post('http://localhost:3000/api/driver/update', {
            taskId: 'demo-task-123',
            driverId: 'driver_001',
            timestamp: Date.now(),
            ...data
        });
        console.log(`Result: Success=${response.data.success}`);
        if (response.data.message) console.log(`Message: ${response.data.message}`);
        if (response.data.reason) console.log(`Reason: ${response.data.reason}`);
        if (response.data.data) console.log(`Status: ${response.data.data.status}`);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

async function runStreamTest() {
    console.log("🚀 Starting Stream Processing Test");

    // 0. Ensure task exists
    try {
        console.log('Initializing task...');
        await axios.post('http://localhost:3000/api/task/init', {
            taskId: 'demo-task-123',
            pickup: { lat: 17.4485, lng: 78.3730 },
            destination: { lat: 17.4585, lng: 78.3830 },
            driver: {
                id: 'driver_001',
                name: 'Test Driver',
                phone: '1234567890'
            }
        });
        console.log('Task initialized.');
    } catch (e) {
        console.error('Init failed:', e.response?.data || e.message);
    }

    // 1. Initial Update (Should Accept)
    await sendUpdate('1. Initial Update', { lat: 17.4485, lng: 78.3730, status: 'ON_THE_WAY' });

    // 2. Fast Update (500ms later) - Should be Throttled
    await sleep(500);
    await sendUpdate('2. Fast Update (Throttled)', { lat: 17.4486, lng: 78.3731 });

    // 3. Status Change (Instant) - Should Bypass Throttle
    await sleep(100);
    await sendUpdate('3. Critical Status Change (Bypass)', { lat: 17.4486, lng: 78.3731, status: 'ARRIVING' });

    // 4. Micro-movement (4s later) - Should be Filtered
    await sleep(4000);
    await sendUpdate('4. Micro-movement (Filtered)', { lat: 17.448601, lng: 78.373101 }); // Almost same location

    // 5. Valid Move (4s later) - Should Accept
    await sleep(4000);
    await sendUpdate('5. Valid Move', { lat: 17.4585, lng: 78.3830, status: 'ARRIVING' });
}

runStreamTest();
