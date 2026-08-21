import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

await page.goto('http://localhost:5173/payroll/loans', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SS}/15a_fresh_load_after_approve.png`, fullPage: true });

const bodyText = await page.locator('body').innerText();
const idx = bodyText.indexOf('TOTAL APPLICATIONS');
console.log(bodyText.slice(idx, idx + 2500));

await browser.close();
