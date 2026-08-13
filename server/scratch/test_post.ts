import axios from 'axios';
const API_URL = 'http://localhost:5000/api/v1';

async function main() {
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@apponexthrms.com',
      password: 'Admin@123'
    });
    const token = loginRes.data.data.accessToken;

    console.log('Got token, making POST request...');
    const postRes = await axios.post(`${API_URL}/settings/notification-templates`, {
      template_name: 'Test Template Create',
      subject: 'Test Subject',
      email_notification: '<p>This is a test</p>',
      is_active: 'Yes'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('POST response:', postRes.status, postRes.data);

    // clean up
    const id = postRes.data.data.id;
    await axios.delete(`${API_URL}/settings/notification-templates/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Cleaned up item', id);

  } catch (error: any) {
    console.error('Request failed:', error.response?.status, error.response?.data || error.message);
  }
}
main();
