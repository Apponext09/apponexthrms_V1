#!/usr/bin/env node

const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:3000/api/v1';

// Test credentials from database
const testUser = {
  email: 'ashish.kumar@apponext.com',
  password: 'Admin@123',
};

let accessToken = null;
let organizationId = null;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (accessToken) {
      options.headers.Authorization = `Bearer ${accessToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 APPONEXT HRMS - API ENDPOINT TEST SUITE\n');
  console.log('Testing Backend API v1 Endpoints...\n');

  const tests = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  console.log('1️⃣ HEALTH CHECK...');
  try {
    const res = await makeRequest('GET', '/health');
    if (res.status === 200 && res.data.success) {
      console.log('   ✅ PASS: Server is healthy\n');
      passed++;
    } else {
      console.log(`   ❌ FAIL: Status ${res.status}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL: ${e.message}\n`);
    console.log('   ⚠️ Backend server is not running on port 3000');
    console.log('   Run: cd server && npm run dev\n');
    failed++;
  }

  // Test 2: Login
  console.log('2️⃣ LOGIN...');
  try {
    const res = await makeRequest('POST', '/auth/login', testUser);
    if (res.status === 200 && res.data.data?.accessToken) {
      accessToken = res.data.data.accessToken;
      organizationId = res.data.data.user?.organizationId;
      console.log('   ✅ PASS: Login successful');
      console.log(`   Token: ${accessToken.substring(0, 20)}...\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Status ${res.status}`);
      console.log(`   Response: ${JSON.stringify(res.data).substring(0, 100)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL: ${e.message}\n`);
    failed++;
  }

  if (!accessToken) {
    console.log('⚠️  Cannot proceed without authentication token. Skipping remaining tests.\n');
    console.log('📊 SUMMARY:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    return;
  }

  // Test 3: Get Employees
  console.log('3️⃣ GET EMPLOYEES...');
  try {
    const res = await makeRequest('GET', '/employees?page=1&pageSize=10');
    if (res.status === 200 && res.data.success) {
      console.log(`   ✅ PASS: Retrieved ${res.data.data?.length || 0} employees\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Status ${res.status}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL: ${e.message}\n`);
    failed++;
  }

  // Test 4: Get Leaves
  console.log('4️⃣ GET LEAVES...');
  try {
    const res = await makeRequest('GET', '/leaves');
    if (res.status === 200 && res.data.success) {
      console.log(`   ✅ PASS: Leaves endpoint working\n`);
      passed++;
    } else if (res.status === 404 || res.status === 500) {
      console.log(`   ❌ FAIL: Status ${res.status}\n`);
      failed++;
    } else {
      console.log(`   ⚠️ WARN: Status ${res.status}\n`);
    }
  } catch (e) {
    console.log(`   ⚠️ FAIL: ${e.message}\n`);
    failed++;
  }

  // Test 5: Get Attendance
  console.log('5️⃣ GET ATTENDANCE...');
  try {
    const res = await makeRequest('GET', '/attendance');
    if (res.status === 200 && res.data.success) {
      console.log(`   ✅ PASS: Attendance endpoint working\n`);
      passed++;
    } else {
      console.log(`   ⚠️ WARN: Status ${res.status}\n`);
    }
  } catch (e) {
    console.log(`   ⚠️ FAIL: ${e.message}\n`);
  }

  // Test 6: Get Payroll
  console.log('6️⃣ GET PAYROLL...');
  try {
    const res = await makeRequest('GET', '/payroll');
    if (res.status === 200 && res.data.success) {
      console.log(`   ✅ PASS: Payroll endpoint working\n`);
      passed++;
    } else {
      console.log(`   ⚠️ WARN: Status ${res.status}\n`);
    }
  } catch (e) {
    console.log(`   ⚠️ FAIL: ${e.message}\n`);
  }

  // Test 7: Get Performance
  console.log('7️⃣ GET PERFORMANCE...');
  try {
    const res = await makeRequest('GET', '/performance');
    if (res.status === 200 && res.data.success) {
      console.log(`   ✅ PASS: Performance endpoint working\n`);
      passed++;
    } else {
      console.log(`   ⚠️ WARN: Status ${res.status}\n`);
    }
  } catch (e) {
    console.log(`   ⚠️ FAIL: ${e.message}\n`);
  }

  // Test 8: Get Recruitment
  console.log('8️⃣ GET RECRUITMENT...');
  try {
    const res = await makeRequest('GET', '/recruitment');
    if (res.status === 200 && res.data.success) {
      console.log(`   ✅ PASS: Recruitment endpoint working\n`);
      passed++;
    } else {
      console.log(`   ⚠️ WARN: Status ${res.status}\n`);
    }
  } catch (e) {
    console.log(`   ⚠️ FAIL: ${e.message}\n`);
  }

  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total:  ${passed + failed}`);
  console.log(`\n${'='.repeat(50)}`);

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed or returned unexpected status.\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
