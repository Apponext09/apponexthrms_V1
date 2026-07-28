import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

(async () => {
  try {
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'employee@apponexthrms.com',
        password: 'Employee@123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken;

    if (!token) {
      console.error('Login failed, no token returned:', loginData);
      return;
    }

    // Submit regularization request
    const postRes = await fetch('http://localhost:3000/api/v1/attendance/regularization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        date: '2026-07-24',
        checkIn: '09:15',
        checkOut: '18:30',
        reason: 'Forgot card at reception desk'
      })
    });
    console.log('POST Regularization Status:', postRes.status);
    const postData = await postRes.json();
    console.log('POST Regularization Response:', postData);

    // List regularization requests
    const regRes = await fetch('http://localhost:3000/api/v1/attendance/regularization', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const regData = await regRes.json();
    console.log('GET Regularization List Response:', regData);
  } catch (err) {
    console.error('Error fetching regularization:', err);
  }
})();
