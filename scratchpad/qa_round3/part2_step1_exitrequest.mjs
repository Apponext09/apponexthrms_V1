import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:\\shakyadita_projects\\apponexthrms\\scratchpad\\qa_round3';
const BASE = 'http://localhost:5173';
const log = (...a) => console.log(new Date().toISOString(), ...a);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') log('PAGE ERROR:', msg.text()); });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'shakya@gmail.com');
  await page.fill('#password', 'shakya@gmail.com');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1200);

  // Try TeamSettlementsPage route for admin to submit exit request on behalf of a team member
  await page.goto(`${BASE}/manager/settlements`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const bodyText = await page.locator('body').innerText();
  log('manager/settlements page loaded, length of body text:', bodyText.length);
  await page.screenshot({ path: `${OUT}/10_manager_settlements_landing.png`, fullPage: true });

  const hasSubmitBtn = await page.locator('button:has-text("Submit Exit Request")').count();
  log('Submit Exit Request button count on /manager/settlements:', hasSubmitBtn);

  fs.writeFileSync(`${OUT}/step1_probe.json`, JSON.stringify({ hasSubmitBtn, bodyTextLen: bodyText.length }, null, 2));

  await browser.close();
})();
