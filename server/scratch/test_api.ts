import axios from 'axios';
const API_URL = 'http://localhost:5000/api/v1'; // Assuming it's 5000 from screenshot

async function main() {
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@apponexthrms.com',
      password: 'Admin@123'
    });
    const token = loginRes.data.data.accessToken;

    console.log('Got token, making GET request...');
    const getRes = await axios.get(`${API_URL}/settings/notification-templates?pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('GET response:', getRes.status, getRes.data);

    // Try a POST request too? Let's just do GET first
  } catch (error: any) {
    console.error('Request failed:', error.response?.status, error.response?.data || error.message);
  }
}
main();
