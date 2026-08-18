import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('salary-structure?employee_id=179')) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, status: res.status(), body });
  }
});

try {
  // fresh navigation (new page load, cache-busted by timestamp query is not needed since it's API call fresh)
  await page.goto('http://localhost:5173/employees/179', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Payroll Detail")').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '07q-arjun-after-edit-reload.png', fullPage: true });
  console.log(JSON.stringify(apiLog, null, 1));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
