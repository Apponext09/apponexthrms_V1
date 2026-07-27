import axios from 'axios';

(async () => {
  try {
    console.log('Testing Port 5000...');
    const res = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'superadmin@apponext.com',
      password: 'SuperAdmin@2026!Secure'
    });
    console.log('Port 5000 response:', res.status, res.data);
  } catch (err) {
    console.log('Port 5000 failed:', err.message, err.code, err.response?.status, err.response?.data);
  }

  try {
    console.log('Testing Port 3000...');
    const res = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'superadmin@apponext.com',
      password: 'SuperAdmin@2026!Secure'
    });
    console.log('Port 3000 response:', res.status, res.data);
  } catch (err) {
    console.log('Port 3000 failed:', err.message, err.code, err.response?.status, err.response?.data);
  }
})();
