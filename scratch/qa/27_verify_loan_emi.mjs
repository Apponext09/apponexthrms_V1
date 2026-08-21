import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

await page.goto('http://localhost:5173/payroll/loans', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
const token = await page.evaluate(() => localStorage.getItem('accessToken'));

const res = await fetch('http://127.0.0.1:5000/api/v1/payroll/loans', { headers: { Authorization: `Bearer ${token}` } });
const body = await res.json();
const saanvi = body.data.find(l => l.employeeId === 180 || l.employee_name === 'Saanvi Ghosh');
console.log('Saanvi loan record:', JSON.stringify(saanvi, null, 2));

// Now check register for Loan EMI deduction on Saanvi via the View modal
await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);
const rows = await page.$$('table tbody tr');
let target = null;
for (const r of rows) {
  const t = await r.innerText();
  if (t.includes('Saanvi')) { target = r; break; }
}
if (target) {
  const viewBtn = await target.$('button:has-text("View")');
  await viewBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '11a-saanvi-loan-emi-in-register.png', fullPage: false });
  console.log('Saanvi register view modal screenshot captured');
} else {
  console.log('Saanvi row not found in register');
}
await browser.close();
