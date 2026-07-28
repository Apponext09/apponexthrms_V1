import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

(async () => {
  try {
    console.log('🔑 Logging in as superadmin@apponext.com...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superadmin@apponext.com',
      password: 'SuperAdmin@2026!Secure'
    });

    const token = loginRes.data.data.accessToken;
    console.log('✅ Logged in! Token retrieved.');

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Test GET /attendance/my-shifts
    console.log('\n📅 Testing GET /attendance/my-shifts?from=2026-07-01&to=2026-07-07...');
    const shiftsRes = await axios.get(`${BASE_URL}/attendance/my-shifts?from=2026-07-01&to=2026-07-07`, { headers });
    console.log('Status:', shiftsRes.status);
    console.log('Shift count:', shiftsRes.data.data.length);
    
    // Find a valid assigned shift day
    const workingDay = shiftsRes.data.data.find(d => !d.isOffDay);
    if (!workingDay) {
      console.log('⚠️ No working day found in the query range!');
    } else {
      console.log('Sample day:', workingDay);
    }

    // 2. Test GET /attendance/my-shifts/today
    console.log('\n📅 Testing GET /attendance/my-shifts/today...');
    const todayRes = await axios.get(`${BASE_URL}/attendance/my-shifts/today`, { headers });
    console.log('Status:', todayRes.status);
    console.log('Today Shift:', todayRes.data.data);

    // 3. Test GET /attendance/my-roster-pattern
    console.log('\n🔄 Testing GET /attendance/my-roster-pattern...');
    const rosterRes = await axios.get(`${BASE_URL}/attendance/my-roster-pattern`, { headers });
    console.log('Status:', rosterRes.status);
    console.log('Roster Pattern:', JSON.stringify(rosterRes.data.data, null, 2));

    // 4. Test POST /attendance/shift-swap-requests
    if (workingDay) {
      console.log(`\n🔄 Testing POST /attendance/shift-swap-requests (swapping shift on ${workingDay.date} with employee 2 John Doe)...`);
      try {
        const swapPostRes = await axios.post(`${BASE_URL}/attendance/shift-swap-requests`, {
          requestShiftDate: workingDay.date,
          requestedShiftId: workingDay.shiftId,
          swapWithEmployeeId: 2, // John Doe
          swapShiftDate: workingDay.date,
          reason: 'Family event'
        }, { headers });
        console.log('Status:', swapPostRes.status);
        console.log('Swap created:', swapPostRes.data.data);
      } catch (swapErr) {
        console.error('Swap Error:', swapErr.response ? swapErr.response.data : swapErr.message);
      }
    }

    // 5. Test GET /attendance/shift-swap-requests/mine
    console.log('\n📜 Testing GET /attendance/shift-swap-requests/mine...');
    const historyRes = await axios.get(`${BASE_URL}/attendance/shift-swap-requests/mine`, { headers });
    console.log('Status:', historyRes.status);
    console.log('Swap history count:', historyRes.data.data.length);
    if (historyRes.data.data.length > 0) {
      console.log('Latest swap:', historyRes.data.data[0]);
    }

  } catch (err) {
    console.error('Verification Error:', err.response ? err.response.data : err.message);
  }
})();
