const axios = require('axios');

async function debugAuthUser() {
  const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
    email: 'abhishek@gmail.com',
    password: 'Admin@123'
  });

  const cookies = loginRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(cookies) ? cookies.map(c => c.split(';')[0]).join('; ') : cookies;
  const token = loginRes.data?.data?.token || loginRes.data?.token || loginRes.data?.data?.accessToken;

  const jwt = require('jsonwebtoken');
  const decoded = jwt.decode(token);
  console.log('Decoded JWT Token Payload:');
  console.log(decoded);
}

debugAuthUser().catch(console.error);
