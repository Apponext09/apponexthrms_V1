import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/employees', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.locator('text=Aarav Mehta').first().click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle', {timeout: 15000}).catch(()=>{});
  console.log('Profile URL:', page.url());
  await page.screenshot({ path: SS + '09c-aarav-profile.png', fullPage: true });

  const bodyText = await page.innerText('body');
  console.log('PROFILE TEXT SNIPPET:', bodyText.slice(0, 3500));

  // look for tabs like "Bank", "Statutory", "Payroll" within employee profile
  const tabTexts = await page.$$eval('button, [role=tab]', els => els.map(e=>e.textContent.trim()).filter(Boolean));
  console.log('TABS:', JSON.stringify([...new Set(tabTexts)].filter(t => t.length < 40)));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
