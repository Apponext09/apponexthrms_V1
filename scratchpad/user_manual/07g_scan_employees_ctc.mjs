import { chromium } from 'playwright';

const STATE = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const results = {};
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000/api/v1/payroll/salary-structure?employee_id=')) {
    let body = null; try { body = await res.json(); } catch {}
    const empId = url.split('employee_id=')[1];
    if (body && body.data && body.data.length) {
      const d = body.data.find(x => x.status === 'active') || body.data[0];
      results[empId] = {
        count: body.data.length,
        code: d.assignedEmployeeCode, name: d.assignedFirstName+' '+d.assignedLastName,
        annualCtc: d.annualCtc, basicMonthly: d.basicMonthly, hraMonthly: d.hraMonthly,
        grossMonthly: d.grossMonthly, pfDeduction: d.pfDeduction, netTakeHome: d.netTakeHome, status: d.status
      };
    } else {
      results[empId] = { count: 0 };
    }
  }
});

try {
  for (let id = 171; id <= 180; id++) {
    await page.goto(`http://localhost:5173/employees/${id}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(()=>{});
    await page.waitForTimeout(600);
    const tab = page.locator('button:has-text("Payroll Detail")').first();
    if (await tab.count() > 0) {
      await tab.click();
      await page.waitForTimeout(1000);
    }
  }
  console.log(JSON.stringify(results, null, 1));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
