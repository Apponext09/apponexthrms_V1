import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text().slice(0,200)));
page.on('pageerror', err => console.log('PAGEERROR:', err.message.slice(0,300)));

try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '01-login.png', fullPage: true });
  console.log('TITLE:', await page.title());
  console.log('URL:', page.url());

  const html = await page.content();
  console.log('HTML LENGTH:', html.length);
  console.log('---INPUTS---');
  const inputs = await page.$$eval('input', els => els.map(e => ({name: e.name, type: e.type, id: e.id, placeholder: e.placeholder})));
  console.log(JSON.stringify(inputs, null, 2));
  console.log('---BUTTONS---');
  const buttons = await page.$$eval('button', els => els.map(e => e.textContent.trim()).filter(Boolean));
  console.log(JSON.stringify(buttons));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
