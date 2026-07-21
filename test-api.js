const http = require('http');

const BASE_URL = 'http://localhost:3000/api/v1';
let token = 'test-token';
let results = { passed: 0, failed: 0, details: [] };

function makeRequest(method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, error: data });
        }
      });
    });

    req.on('error', () => resolve({ status: 0, error: 'Connection failed' }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('===== ASSET MANAGEMENT API TESTS =====\n');

  // Test 1: Create Category
  console.log('[1] POST /assets/categories - Create Asset Category');
  let res = await makeRequest('POST', '/assets/categories', {
    name: 'Laptops',
    code: 'LAP',
    description: 'Laptop computers',
    status: 'active'
  });

  let categoryId = null;
  if (res.status === 201 && res.data?.success) {
    categoryId = res.data.data?.id;
    console.log('✓ PASS - Category created (ID:', categoryId, ')');
    results.passed++;
  } else {
    console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
    results.failed++;
  }

  // Test 2: Create Vendor
  console.log('\n[2] POST /assets/vendors - Create Vendor');
  res = await makeRequest('POST', '/assets/vendors', {
    name: 'Dell Technologies',
    email: 'sales@dell.com',
    phone: '+1-800-123-4567',
    address: '123 Tech Street',
    city: 'Austin',
    country: 'USA',
    status: 'active'
  });

  let vendorId = null;
  if (res.status === 201 && res.data?.success) {
    vendorId = res.data.data?.id;
    console.log('✓ PASS - Vendor created (ID:', vendorId, ')');
    results.passed++;
  } else {
    console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
    results.failed++;
  }

  // Test 3: Create Asset
  console.log('\n[3] POST /assets - Create Asset');
  if (!categoryId) {
    console.log('⚠ SKIP - No category ID');
  } else {
    res = await makeRequest('POST', '/assets', {
      categoryId: categoryId,
      assetCode: 'LAP-001',
      brand: 'Dell',
      model: 'XPS 13',
      serialNumber: 'SN123456789',
      purchaseDate: '2026-01-15',
      warrantyStart: '2026-01-15',
      warrantyEnd: '2027-01-15',
      cost: 1299.99,
      vendorId: vendorId,
      status: 'available',
      condition: 'excellent'
    });

    let assetId = null;
    if (res.status === 201 && res.data?.success) {
      assetId = res.data.data?.id;
      console.log('✓ PASS - Asset created (ID:', assetId, ')');
      results.passed++;
    } else {
      console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
      results.failed++;
    }

    // Test 4: Get Asset
    if (assetId) {
      console.log('\n[4] GET /assets/:id - Get Asset Details');
      res = await makeRequest('GET', `/assets/${assetId}`);
      if (res.status === 200 && res.data?.success && res.data.data?.id === assetId) {
        console.log('✓ PASS - Asset retrieved');
        results.passed++;
      } else {
        console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
        results.failed++;
      }

      // Test 5: List Assets
      console.log('\n[5] GET /assets - List Assets');
      res = await makeRequest('GET', '/assets?page=1&pageSize=10');
      if (res.status === 200 && res.data?.success && res.data.meta) {
        console.log('✓ PASS - Assets listed (Total:', res.data.meta.total, ')');
        results.passed++;
      } else {
        console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
        results.failed++;
      }

      // Test 6: Assign Asset
      console.log('\n[6] POST /assets/assign - Assign Asset');
      res = await makeRequest('POST', '/assets/assign', {
        assetId: assetId,
        employeeId: 1,
        assignmentType: 'permanent',
        assignedDate: '2026-07-16',
        notes: 'Test assignment'
      });

      let assignmentId = null;
      if (res.status === 201 && res.data?.success) {
        assignmentId = res.data.data?.id;
        console.log('✓ PASS - Asset assigned (ID:', assignmentId, ')');
        results.passed++;
      } else {
        console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
        results.failed++;
      }

      // Test 7: Create Maintenance
      console.log('\n[7] POST /assets/maintenance - Create Maintenance');
      res = await makeRequest('POST', '/assets/maintenance', {
        assetId: assetId,
        maintenanceType: 'repair',
        startDate: '2026-07-17',
        vendorId: vendorId,
        description: 'Screen replacement'
      });

      if (res.status === 201 && res.data?.success) {
        console.log('✓ PASS - Maintenance created');
        results.passed++;
      } else {
        console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
        results.failed++;
      }

      // Test 8: Create License
      console.log('\n[8] POST /assets/licenses - Create Software License');
      res = await makeRequest('POST', '/assets/licenses', {
        softwareName: 'Microsoft Office 365',
        licenseKey: 'XXXX-XXXX-XXXX-XXXX',
        licenseType: 'subscription',
        totalLicenses: 10,
        purchaseDate: '2026-01-01',
        expiryDate: '2027-01-01',
        cost: 500.00,
        vendorId: vendorId
      });

      let licenseId = null;
      if (res.status === 201 && res.data?.success) {
        licenseId = res.data.data?.id;
        console.log('✓ PASS - License created (ID:', licenseId, ')');
        results.passed++;
      } else {
        console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
        results.failed++;
      }

      // Test 9: Create Asset Request
      console.log('\n[9] POST /assets/requests - Create Asset Request');
      res = await makeRequest('POST', '/assets/requests', {
        employeeId: 2,
        categoryId: categoryId,
        assetModel: 'MacBook Pro',
        specification: '16GB RAM, 512GB SSD',
        reason: 'Development work',
        requiredDate: '2026-07-25'
      });

      if (res.status === 201 && res.data?.success) {
        console.log('✓ PASS - Request created');
        results.passed++;
      } else {
        console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
        results.failed++;
      }

      // Test 10: Update Asset
      console.log('\n[10] PUT /assets/:id - Update Asset');
      res = await makeRequest('PUT', `/assets/${assetId}`, {
        condition: 'good',
        notes: 'Updated condition'
      });

      if (res.status === 200 && res.data?.success) {
        console.log('✓ PASS - Asset updated');
        results.passed++;
      } else {
        console.log('✗ FAIL -', res.status, res.error || res.data?.error?.message);
        results.failed++;
      }
    }
  }

  // Summary
  console.log('\n===== TEST SUMMARY =====');
  console.log('Passed:', results.passed);
  console.log('Failed:', results.failed);
  console.log('Total:', results.passed + results.failed);
  process.exit(results.failed === 0 ? 0 : 1);
}

runTests().catch(console.error);
