import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

// capture one legit payroll api request/response for evidence
let capturedPair = null;
page.on('response', async (res) => {
  if (res.url().includes('process-register') && !capturedPair) {
    let body = null;
    try { body = await res.json(); } catch {}
    capturedPair = {
      url: res.url(),
      method: res.request().method(),
      status: res.status(),
      reqHeaders: res.request().headers(),
      bodyPreview: JSON.stringify(body)?.slice(0, 800)
    };
  }
});

await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// get the token from localStorage
const token = await page.evaluate(() => localStorage.getItem('accessToken'));
console.log('Token present:', !!token, 'length:', token?.length);

console.log('--- Legit authenticated request/response pair ---');
console.log(JSON.stringify(capturedPair, null, 2)?.slice(0, 2000));

await page.screenshot({ path: SS + '08a-authenticated-network-evidence.png', fullPage: false });

// Now test WITHOUT auth token - direct fetch from node using fetch API (not through browser context to avoid storage state)
console.log('\n--- Testing API WITHOUT auth token ---');
try {
  const res1 = await fetch('http://127.0.0.1:5000/api/v1/payroll/process-register?month=2026-08', {
    headers: { 'Content-Type': 'application/json' }
  });
  console.log('No-auth status:', res1.status);
  const body1 = await res1.text();
  console.log('No-auth body:', body1.slice(0, 500));
} catch (e) { console.log('No-auth fetch error:', e.message); }

console.log('\n--- Testing API WITH invalid/garbage token ---');
try {
  const res2 = await fetch('http://127.0.0.1:5000/api/v1/payroll/process-register?month=2026-08', {
    headers: { 'Authorization': 'Bearer invalid.garbage.token123', 'Content-Type': 'application/json' }
  });
  console.log('Invalid-token status:', res2.status);
  const body2 = await res2.text();
  console.log('Invalid-token body:', body2.slice(0, 500));
} catch (e) { console.log('Invalid-token fetch error:', e.message); }

console.log('\n--- Testing payroll list API without auth ---');
try {
  const res3 = await fetch('http://127.0.0.1:5000/api/v1/payroll?cycleId=10');
  console.log('No-auth payroll list status:', res3.status);
  const body3 = await res3.text();
  console.log('No-auth payroll list body:', body3.slice(0, 500));
} catch (e) { console.log('error:', e.message); }

console.log('\n--- Testing employee list API without auth ---');
try {
  const res4 = await fetch('http://127.0.0.1:5000/api/v1/employees');
  console.log('No-auth employees status:', res4.status);
  const body4 = await res4.text();
  console.log('No-auth employees body:', body4.slice(0, 500));
} catch (e) { console.log('error:', e.message); }

await browser.close();
