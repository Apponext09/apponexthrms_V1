// server/scratch/simulate_employee_movement.ts
// Utility script to simulate live Swiggy/Zomato style movement on localhost for testing

import { io } from 'socket.io-client';
import { generateAccessToken } from '../src/common/lib/jwt.js';
import { getKnex } from '../src/db/knex.js';

async function runSimulation() {
  const db = getKnex();

  // Find active employee user
  const user = await db('users')
    .whereNotNull('employee_id')
    .select('id', 'organization_id', 'employee_id', 'email')
    .first();

  if (!user) {
    console.error('No employee user found in DB to simulate.');
    process.exit(1);
  }

  console.log(`Simulating movement for Employee ID: ${user.employee_id} (${user.email})...`);

  // Generate valid access token
  const token = generateAccessToken({
    sub: String(user.id),
    oid: String(user.organization_id),
    sid: 'simulation-session',
  });

  const socket = io('http://localhost:5000/live-tracking', {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('✅ Connected to /live-tracking socket namespace!');

    // Base coordinates (e.g., Connaught Place, New Delhi or Bangalore)
    let lat = 28.6139;
    let lng = 77.2090;
    let step = 0;

    console.log('🚀 Starting automated live movement pings every 3 seconds...');
    console.log('Press Ctrl+C to stop simulation.');

    const interval = setInterval(() => {
      step++;
      // Move slightly north-east along a simulated path
      lat += 0.00025; // approx 25-30 meters per step
      lng += 0.00025;

      const payload = {
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        speed: 15, // 15 km/h (biking speed)
        heading: 45, // Northeast
      };

      console.log(`[Ping #${step}] Sending location update -> Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
      socket.emit('employee:ping_location', payload);

      if (step >= 100) {
        clearInterval(interval);
        console.log('Simulation complete (100 steps).');
        socket.disconnect();
        process.exit(0);
      }
    }, 3000);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
  });
}

runSimulation().catch(console.error);
