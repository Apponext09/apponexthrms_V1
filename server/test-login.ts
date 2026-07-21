import axios from 'axios';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    status: string;
  };
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  roles: Array<{ code: string; name: string }>;
  permissions: string[];
}

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

const testUsers = [
  {
    email: 'admin@apponexthrms.com',
    password: 'Admin@123',
    role: 'organization_admin',
  },
  {
    email: 'hr@apponexthrms.com',
    password: 'Hr@123',
    role: 'hr_manager',
  },
  {
    email: 'employee@apponexthrms.com',
    password: 'Employee@123',
    role: 'employee',
  },
];

async function testLogin(email: string, password: string, expectedRole: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing login for: ${email}`);
  console.log(`${'='.repeat(70)}`);

  try {
    const payload: LoginRequest = { email, password };

    console.log('\n📤 REQUEST:');
    console.log(`Method: POST`);
    console.log(`URL: ${API_URL}/auth/login`);
    console.log(`Payload:`);
    console.log(JSON.stringify(payload, null, 2));

    const response = await axios.post<LoginResponse>(
      `${API_URL}/auth/login`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    console.log('\n📥 RESPONSE:');
    console.log(`Status: ${response.status} ${response.statusText}`);

    const loginData = response.data.data;

    console.log(`\nUser Info:`);
    console.log(`  - ID: ${loginData.user.id}`);
    console.log(`  - Email: ${loginData.user.email}`);
    console.log(`  - Status: ${loginData.user.status}`);

    console.log(`\nOrganization:`);
    console.log(`  - ID: ${loginData.organization.id}`);
    console.log(`  - Name: ${loginData.organization.name}`);
    console.log(`  - Slug: ${loginData.organization.slug}`);

    console.log(`\nRoles:`);
    if (loginData.roles && loginData.roles.length > 0) {
      loginData.roles.forEach((role) => {
        console.log(`  - ${role.code} (${role.name})`);
      });
    } else {
      console.log(`  - None`);
    }

    console.log(`\nPermissions: ${loginData.permissions?.length || 0} total`);
    if (loginData.permissions && loginData.permissions.length > 0) {
      console.log(`  - ${loginData.permissions.slice(0, 5).join(', ')}`);
      if (loginData.permissions.length > 5) {
        console.log(`  - ... and ${loginData.permissions.length - 5} more`);
      }
    }

    console.log(`\n🔐 TOKENS:`);
    console.log(`Access Token (first 50 chars): ${loginData.accessToken.substring(0, 50)}...`);
    console.log(`Refresh Token (first 50 chars): ${loginData.refreshToken.substring(0, 50)}...`);

    // Decode and parse JWT to show payload
    const tokenParts = loginData.accessToken.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(
          Buffer.from(tokenParts[1], 'base64').toString('utf-8')
        );
        console.log(`\nAccess Token Payload:`);
        console.log(JSON.stringify(payload, null, 2));
      } catch (e) {
        console.log('Could not decode token payload');
      }
    }

    console.log(`\n✅ LOGIN SUCCESSFUL`);
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('\n❌ LOGIN FAILED');
      console.log(`Status: ${error.response?.status}`);
      console.log(`Error: ${error.response?.data?.message || error.message}`);

      if (error.response?.data) {
        console.log(`\nError Response:`);
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    } else {
      console.log('\n❌ CONNECTION ERROR');
      console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    return false;
  }
}

async function main() {
  console.log('ApponextHRMS Login Test Suite');
  console.log(`API Base URL: ${API_URL}`);
  console.log(`Testing ${testUsers.length} users...\n`);

  const results: { user: string; success: boolean }[] = [];

  for (const user of testUsers) {
    const success = await testLogin(user.email, user.password, user.role);
    results.push({ user: user.email, success });
    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n\n${'='.repeat(70)}`);
  console.log('TEST SUMMARY');
  console.log(`${'='.repeat(70)}`);

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.user}`);
  }

  const allPassed = results.every((r) => r.success);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  console.log(`${'='.repeat(70)}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});
