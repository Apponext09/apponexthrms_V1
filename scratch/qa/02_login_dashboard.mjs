import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('#email', 'shakya@gmail.com');
  await page.fill('#password', 'shakya@gmail.com');
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(()=>{});
  console.log('URL after login:', page.url());
  await page.screenshot({ path: SS + '02-post-login-dashboard.png', fullPage: true });

  // Save storage state for reuse
  await context.storageState({ path: STATE });

  // Explore nav links
  const links = await page.$$eval('a', els => els.map(e => ({text: e.textContent.trim(), href: e.getAttribute('href')})).filter(l => l.text));
  console.log('---NAV LINKS---');
  console.log(JSON.stringify(links, null, 2));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
