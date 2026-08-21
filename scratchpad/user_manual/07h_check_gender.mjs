import { chromium } from 'playwright';

const STATE = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  for (const id of [173,174,175,176,177,178,179,180]) {
    await page.goto(`http://localhost:5173/employees/${id}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(()=>{});
    await page.waitForTimeout(500);
    const t = await page.innerText('body');
    const nameMatch = t.match(/^([A-Za-z ]+)\nEMP0\d+/m);
    const genderMatch = t.match(/GENDER\s*\n\s*([A-Za-z]+)/);
    console.log(id, nameMatch ? nameMatch[1] : '?', genderMatch ? genderMatch[1] : '?');
  }
} catch (e) { console.log('ERROR:', e.message); }

await browser.close();
