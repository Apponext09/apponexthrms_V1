import http from 'http';

http.get('http://localhost:3000/api/v1/leaves/balances', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('HTTP Response Data:', data);
  });
}).on('error', (err) => console.error('HTTP Error:', err));
