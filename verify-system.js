#!/usr/bin/env node

/**
 * APPONEXT HRMS - SYSTEM VERIFICATION SCRIPT
 *
 * This script verifies that all components are correctly configured
 * without requiring the servers to be running.
 */

const fs = require('fs');
const path = require('path');

const checks = [];
let passed = 0;
let failed = 0;
let warnings = 0;

function check(name, fn) {
  try {
    const result = fn();
    if (result.status === 'pass') {
      checks.push({ name, status: 'pass', message: result.message });
      console.log(`✅ ${name}`);
      passed++;
    } else if (result.status === 'warn') {
      checks.push({ name, status: 'warn', message: result.message });
      console.log(`⚠️  ${name}`);
      warnings++;
    } else {
      checks.push({ name, status: 'fail', message: result.message });
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (error) {
    checks.push({ name, status: 'error', message: error.message });
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

console.log('🔍 APPONEXT HRMS - SYSTEM VERIFICATION\n');
console.log('Checking configuration and file structure...\n');

// 1. Environment Configuration
check('Environment file exists', () => {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('DB_HOST')) {
      return { status: 'pass', message: '.env configured' };
    } else {
      return { status: 'fail', message: '.env missing database config' };
    }
  }
  return { status: 'fail', message: '.env file not found' };
});

// 2. Backend Structure
check('Backend source directory exists', () => {
  if (fs.existsSync(path.join(process.cwd(), 'server/src'))) {
    return { status: 'pass', message: 'Backend structure ready' };
  }
  return { status: 'fail', message: 'server/src not found' };
});

// 3. Frontend Structure
check('Frontend source directory exists', () => {
  if (fs.existsSync(path.join(process.cwd(), 'client/src'))) {
    return { status: 'pass', message: 'Frontend structure ready' };
  }
  return { status: 'fail', message: 'client/src not found' };
});

// 4. Database Migrations
check('Database migrations directory exists', () => {
  if (fs.existsSync(path.join(process.cwd(), 'database/migrations'))) {
    const files = fs.readdirSync(path.join(process.cwd(), 'database/migrations'));
    return { status: 'pass', message: `${files.length} migration files found` };
  }
  return { status: 'fail', message: 'migrations directory not found' };
});

// 5. Backend Routes
const routeFiles = [
  'server/src/modules/auth/auth.routes.ts',
  'server/src/modules/employee/employee.routes.ts',
  'server/src/modules/leaves/leaves.routes.ts',
  'server/src/modules/attendance/attendance.routes.ts',
  'server/src/modules/payroll/payroll.routes.ts',
  'server/src/modules/performance/performance.routes.ts',
  'server/src/modules/recruitment/recruitment.routes.ts',
  'server/src/modules/notifications/notification.routes.ts',
  'server/src/modules/settings/settings.routes.ts',
  'server/src/modules/asset/asset.routes.ts',
  'server/src/modules/workflow/workflow.routes.ts',
  'server/src/modules/rbac/rbac.routes.ts',
  'server/src/modules/users/users.routes.ts',
  'server/src/modules/organizations/organizations.routes.ts',
];

let missingRoutes = 0;
routeFiles.forEach(route => {
  if (!fs.existsSync(path.join(process.cwd(), route))) {
    missingRoutes++;
  }
});

check('API route files configured', () => {
  const count = routeFiles.length - missingRoutes;
  if (missingRoutes === 0) {
    return { status: 'pass', message: `All ${count} route files present` };
  } else {
    return { status: 'fail', message: `${missingRoutes} route files missing` };
  }
});

// 6. API Client Configuration
check('Frontend API client configured', () => {
  const apiPath = path.join(process.cwd(), 'client/src/lib/api.ts');
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    if (content.includes('localhost:3000') || content.includes('API_BASE_URL')) {
      return { status: 'pass', message: 'API client configured' };
    } else {
      return { status: 'warn', message: 'API client exists but config unclear' };
    }
  }
  return { status: 'fail', message: 'api.ts not found' };
});

// 7. Authentication Service
check('Authentication service implemented', () => {
  const authPath = path.join(process.cwd(), 'server/src/modules/auth/auth.service.ts');
  if (fs.existsSync(authPath)) {
    const content = fs.readFileSync(authPath, 'utf8');
    if (content.includes('async login') && content.includes('Argon2id' || 'argon2')) {
      return { status: 'pass', message: 'Auth service with Argon2 hashing' };
    } else {
      return { status: 'warn', message: 'Auth service exists but hashing unclear' };
    }
  }
  return { status: 'fail', message: 'auth.service.ts not found' };
});

// 8. Express App Configuration
check('Express app configured with CORS', () => {
  const appPath = path.join(process.cwd(), 'server/src/app.ts');
  if (fs.existsSync(appPath)) {
    const content = fs.readFileSync(appPath, 'utf8');
    if (content.includes('cors') && content.includes('middleware')) {
      return { status: 'pass', message: 'CORS and middleware configured' };
    } else {
      return { status: 'warn', message: 'app.ts exists but config unclear' };
    }
  }
  return { status: 'fail', message: 'app.ts not found' };
});

// 9. Package Dependencies
check('Backend dependencies configured', () => {
  const pkgPath = path.join(process.cwd(), 'server/package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const required = ['express', 'mysql2', 'argon2'];
    const missing = required.filter(dep => !pkg.dependencies?.[dep]);
    if (missing.length === 0) {
      return { status: 'pass', message: 'All critical dependencies configured' };
    } else {
      return { status: 'warn', message: `Missing: ${missing.join(', ')}` };
    }
  }
  return { status: 'fail', message: 'package.json not found' };
});

check('Frontend dependencies configured', () => {
  const pkgPath = path.join(process.cwd(), 'client/package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const required = ['react', 'axios', '@tanstack/react-query'];
    const missing = required.filter(dep => !pkg.dependencies?.[dep]);
    if (missing.length === 0) {
      return { status: 'pass', message: 'All critical dependencies configured' };
    } else {
      return { status: 'warn', message: `Missing: ${missing.join(', ')}` };
    }
  }
  return { status: 'fail', message: 'package.json not found' };
});

// 10. Database Configuration
check('Database configuration present', () => {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    const missing = required.filter(key => !content.includes(key));
    if (missing.length === 0) {
      return { status: 'pass', message: 'Database config complete' };
    } else {
      return { status: 'fail', message: `Missing: ${missing.join(', ')}` };
    }
  }
  return { status: 'fail', message: '.env not found' };
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log('VERIFICATION SUMMARY:');
console.log(`${'='.repeat(50)}`);
console.log(`✅ Passed:  ${passed}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Failed:  ${failed}`);
console.log(`${'='.repeat(50)}\n`);

if (failed === 0 && warnings <= 2) {
  console.log('🎉 SYSTEM READY FOR TESTING!\n');
  console.log('Next steps:');
  console.log('  1. Terminal 1: cd server && npm run dev');
  console.log('  2. Terminal 2: cd client && npm run dev');
  console.log('  3. Browser: http://localhost:5174');
  console.log('  4. Login: admin@example.com / Admin@123\n');
} else if (failed === 0) {
  console.log('⚠️  Some warnings detected. Review above.\n');
} else {
  console.log('❌ System has critical issues. Fix above before proceeding.\n');
}

process.exit(failed > 0 ? 1 : 0);
