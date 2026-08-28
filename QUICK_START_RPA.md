# 🚀 Quick Start - HRMS RPA Testing

## What is this?

This is an automated testing system (RPA) for your HRMS application. It automatically tests all major features and generates a beautiful report with screenshots.

## 3-Step Quick Start

### Step 1: Prepare Your Application

Make sure your HRMS app is running:

```bash
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

Leave this terminal open.

### Step 2: Run Tests (New Terminal)

Open a new terminal and run:

```bash
npm run test:e2e
```

**What happens:**
- ✅ Tests will run automatically
- ✅ Browser will open in the background
- ✅ Tests navigate through your app
- ✅ Results are collected
- ✅ Report is generated

**Expected output:**
```
  ✓ tests/e2e/auth.spec.ts (6)
  ✓ tests/e2e/dashboard.spec.ts (8)
  ✓ tests/e2e/employee.spec.ts (10)
  ...
  
  116 passed (2m 45s)
```

### Step 3: View Your Report

Once tests complete, open the report:

```bash
npm run test:e2e:report
```

Your browser will open with a beautiful dashboard showing:
- ✅ Pass/Fail statistics
- ✅ Individual test results
- ✅ Screenshots of failures
- ✅ Timing information

## What Gets Tested?

| Module | Tests | Coverage |
|--------|-------|----------|
| 🔐 Authentication | 6 | Login, logout, sessions |
| 📊 Dashboard | 8 | Navigation, loading, responsive |
| 👥 Employees | 10 | List, search, filter, create |
| 📅 Leaves | 10 | Apply, approve, balance |
| 🗂️ Navigation | 12 | All modules, breadcrumbs |
| **Total** | **46** | **Comprehensive coverage** |

## Test Reports Location

After running tests, find reports here:

1. **Main Report** (Beautiful HTML):
   ```
   test-results/HRMS-TEST-REPORT.html
   ```

2. **Detailed Report** (With videos):
   ```
   test-results/index.html
   ```

3. **JSON Results** (For parsing):
   ```
   test-results/results.json
   ```

## Common Commands

### See tests running in browser:
```bash
npm run test:e2e:headed
```

### Interactive test UI:
```bash
npm run test:e2e:ui
```

### Debug mode (step-through):
```bash
npm run test:e2e:debug
```

### Show report again:
```bash
npm run test:e2e:report
```

## Updating Test Credentials

Tests use demo credentials. Update them here:

**File**: `tests/e2e/fixtures/testdata.ts`

```typescript
export const testUsers = {
  admin: {
    email: 'your@email.com',
    password: 'YourPassword123',
  },
  // ... etc
};
```

Then re-run tests.

## Understanding Results

### ✅ Green (Passed)
Feature is working correctly.

### ❌ Red (Failed)
Feature has an issue. Check:
1. Error message in report
2. Screenshot of failure
3. Test logs

### ⊝ Yellow (Skipped)
Optional test not run (feature may not exist).

## Troubleshooting

### Problem: "Cannot find element"
**Solution**: 
- Check test credentials are correct
- Verify app is running on http://localhost:5173
- Check app hasn't changed significantly

### Problem: Tests timeout
**Solution**:
- Check your internet connection
- Verify app is responsive
- Try: `npm run test:e2e:headed`

### Problem: No browser window opens
**Solution**:
- This is normal! Tests run headless (background)
- Use `npm run test:e2e:headed` to see browser
- Results are in the report

### Problem: Report won't open
**Solution**:
- Delete `test-results` folder
- Run tests again
- Report will be created fresh

## Sample Report Output

```html
🧪 HRMS Application Test Report
─────────────────────────────────

📊 Statistics:
  • Total Tests: 46
  • Passed: 44 ✓
  • Failed: 2 ✗
  • Skipped: 0 ⊝
  • Success Rate: 95.7%

📋 Test Suites:
  ✓ Authentication Tests (6/6 passed)
  ✓ Dashboard Tests (8/8 passed)
  ⚠ Employee Tests (6/10 passed)
    ✗ should allow filtering employees
    ✗ should handle pagination
  ✓ Leave Tests (10/10 passed)
  ✓ Navigation Tests (12/12 passed)
```

## Next Steps

1. ✅ Run `npm run test:e2e`
2. ✅ Review report: `npm run test:e2e:report`
3. ✅ Check failures and fix
4. ✅ Re-run to verify fixes
5. ✅ Setup in CI/CD pipeline

## Tips

💡 **Tip 1**: Run tests daily to catch regressions

💡 **Tip 2**: Share reports with your team

💡 **Tip 3**: Use `headed` mode to debug failures

💡 **Tip 4**: Check video recordings for complex failures

💡 **Tip 5**: Keep test data updated

## Questions?

📖 **Full Guide**: `RPA_TESTING_GUIDE.md`

🎓 **Learn Playwright**: https://playwright.dev

---

**That's it!** Your automated testing is ready. Run `npm run test:e2e` now! 🎉
