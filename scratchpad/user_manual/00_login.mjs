import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  console.log('URL:', page.url());
  const emailInput = await page.$('input[type="email"], input[name*="email" i], input[placeholder*="email" i]');
  if (emailInput) {
    await emailInput.fill('shakya@gmail.com');
  } else {
    console.log('No email input found, dumping inputs');
    const inputs = await page.$$eval('input', els => els.map(e => ({name: e.name, type: e.type, id: e.id, placeholder: e.placeholder})));
    console.log(JSON.stringify(inputs));
  }
  const pwInput = await page.$('input[type="password"]');
  if (pwInput) await pwInput.fill('shakya@gmail.com');
  await page.screenshot({ path: SS + '00-login-filled.png' });
  const loginBtn = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();
  await loginBtn.click();
  await page.waitForURL(url => !url.pathname.includes('login'), { timeout: 20000 }).catch(e => console.log('waitForURL timeout:', e.message));
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  console.log('Post-login URL:', page.url());
  await page.screenshot({ path: SS + '00-post-login.png', fullPage: true });
  await context.storageState({ path: STATE });
  console.log('Saved storage state to', STATE);
} catch (e) {
  console.log('ERROR:', e.message);
}
await browser.close();
