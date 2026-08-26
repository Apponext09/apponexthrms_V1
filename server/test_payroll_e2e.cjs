/**
 * End-to-End Payroll Processing Test
 * Calls the actual SalaryCalculationService via HTTP to test
 * whether payroll processes correctly with the new formulas.
 *
 * Run: node test_payroll_e2e.cjs
 */
const http = require('http');

// ─── Config ────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:5000';
const ORG_ID   = 8;

// Test employees from payslip data (use real IDs from DB)
// We'll fetch them dynamically from the API
// ─────────────────────────────────────────────────────────────

function request(method, path, body, token, companyId) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token)     headers['Authorization'] = 'Bearer ' + token;
    if (companyId) headers['X-Company-Id']  = String(companyId);

    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: method,
      headers: headers
    };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch (e) { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function fmt(n) {
  if (n === undefined || n === null) return '₹-';
  return '₹' + Number(n).toLocaleString('en-IN');
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  PAYROLL END-TO-END TEST');
  console.log('════════════════════════════════════════════════════════');

  // STEP 1: Login as CEO/Admin to get token
  console.log('\n[1] Logging in...');
  const loginRes = await request('POST', '/api/v1/auth/login', {
    email: 'admin@apponext.com',
    password: 'Admin@123'
  });

  if (loginRes.status !== 200) {
    console.error('❌ Login failed:', loginRes.status, JSON.stringify(loginRes.data).slice(0, 200));
    console.log('\n⚠️  Update email/password in this script and retry.');
    process.exit(1);
  }

  const token     = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
  const companyId = loginRes.data?.data?.companies?.[0]?.id || loginRes.data?.data?.companyId || 1;
  console.log('   ✅ Logged in | company_id =', companyId);

  // STEP 2: Fetch payroll components to verify formulas are set
  console.log('\n[2] Fetching payroll components...');
  const compRes = await request('GET', '/api/v1/payroll/component-definitions', null, token, companyId);
  const raw = compRes.data;
  const allComps = Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw?.data?.components) ? raw.data.components
    : [];
  const derivedComps = allComps.filter(c => c.component_type === 'Derived' || c.componentType === 'Derived');

  console.log(`   Total components : ${allComps.length}`);
  console.log(`   Derived (formula): ${derivedComps.length}`);
  console.log('\n   Component Formulas:');
  for (const c of derivedComps) {
    const formula = c.formula || '(no formula)';
    const ok = formula && formula !== '(no formula)' ? '✅' : '❌';
    console.log(`   ${ok}  ${(c.name || c.component_name || '').padEnd(40)} ${formula}`);
  }

  // STEP 3: Fetch employees
  console.log('\n[3] Fetching employees...');
  const empRes = await request('GET', '/api/v1/employees?pageSize=5&page=1', null, token, companyId);
  const employees = empRes.data?.data?.employees || empRes.data?.employees || empRes.data?.data || [];
  if (!employees.length) {
    console.error('❌ No employees found');
    process.exit(1);
  }
  console.log(`   Found ${employees.length} employees (testing first 3)`);

  // STEP 4: Test salary calculation for first 3 employees
  console.log('\n[4] Testing salary calculation per employee...');
  console.log('─'.repeat(70));

  const testEmps = employees.slice(0, 3);
  for (const emp of testEmps) {
    const empId = emp.id || emp.employee_id || emp.employeeId;
    const name  = [emp.firstName || emp.first_name, emp.lastName || emp.last_name].filter(Boolean).join(' ');

    // Call the salary calculation / preview endpoint
    const calcRes = await request(
      'POST',
      '/api/v1/payroll/calculate-salary',
      { employeeId: empId, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
      token, companyId
    );

    if (calcRes.status !== 200) {
      // Try alternate endpoint
      const calcRes2 = await request(
        'GET',
        `/api/v1/payroll/salary-preview/${empId}`,
        null, token, companyId
      );
      if (calcRes2.status === 200) {
        printResult(name, empId, calcRes2.data?.data || calcRes2.data);
      } else {
        console.log(`   ⚠️  ${name} (id=${empId}): No preview endpoint found (${calcRes.status})`);
      }
    } else {
      printResult(name, empId, calcRes.data?.data || calcRes.data);
    }
  }

  // STEP 5: Fetch latest payslip and check components
  console.log('\n[5] Checking latest payslips for component detail...');
  const slipRes = await request('GET', '/api/v1/payroll/payslips?limit=3', null, token, companyId);
  const payslips = slipRes.data?.data?.payslips || slipRes.data?.payslips || slipRes.data?.data || [];

  if (!payslips.length) {
    console.log('   ⚠️  No payslips found yet. Process payroll first, then re-run this test.');
  } else {
    for (const slip of payslips.slice(0, 2)) {
      const slipId   = slip.id || slip.payslipId;
      const empName  = slip.employeeName || slip.employee_name || `EmpID ${slip.employee_id}`;
      const earnings = slip.earnings || slip.earningsBreakup || [];
      const deducts  = slip.deductions || slip.deductionsBreakup || [];

      console.log(`\n   📄 Payslip: ${empName}`);
      console.log(`      Month: ${slip.month || slip.payroll_month} | Net: ${fmt(slip.netSalary || slip.net_salary)}`);
      console.log('      Earnings:');
      for (const e of earnings) {
        console.log(`        • ${(e.name || e.component_name || '').padEnd(35)} ${fmt(e.amount)}`);
      }
      console.log('      Deductions:');
      for (const d of deducts) {
        console.log(`        • ${(d.name || d.component_name || '').padEnd(35)} ${fmt(d.amount)}`);
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log('  ✅ E2E test complete');
  console.log('════════════════════════════════════════════════════════\n');
}

function printResult(name, empId, data) {
  if (!data) { console.log(`   ❌ ${name}: empty response`); return; }
  const gross   = data.grossSalary || data.gross_salary || data.gross || 0;
  const net     = data.netSalary   || data.net_salary   || data.net   || 0;
  const deducts = data.totalDeductions || data.total_deductions || 0;
  const earnings = data.earnings || data.earningsBreakup || [];
  const deductions = data.deductions || data.deductionsBreakup || [];

  console.log(`\n   👤 ${name} (id=${empId})`);
  console.log(`      Gross: ${fmt(gross)} | Deductions: ${fmt(deducts)} | Net: ${fmt(net)}`);
  if (earnings.length) {
    console.log('      Earnings breakdown:');
    for (const e of earnings) {
      const f = e.formula ? `  [formula: ${e.formula}]` : '';
      console.log(`        • ${(e.name || '').padEnd(35)} ${fmt(e.amount)}${f}`);
    }
  }
  if (deductions.length) {
    console.log('      Deductions:');
    for (const d of deductions) {
      console.log(`        • ${(d.name || '').padEnd(35)} ${fmt(d.amount)}`);
    }
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
