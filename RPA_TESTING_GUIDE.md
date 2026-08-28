# HRMS Application - RPA Testing Suite

## Overview

This is a comprehensive end-to-end (E2E) testing suite for the HRMS (Human Resource Management System) application built with **Playwright**, a powerful browser automation framework. The RPA suite automatically tests your application, captures screenshots, and generates detailed HTML reports showing passed/failed tests.

## Features

✅ **Automated Testing** - Tests core functionality without manual intervention
✅ **Screenshot Capture** - Captures screenshots of failed tests for debugging
✅ **Comprehensive Reporting** - Beautiful HTML reports with statistics
✅ **Multiple Test Suites** - Organized tests for different modules
✅ **Cross-Browser Support** - Tests in Chromium (easily extensible to Firefox, Safari)
✅ **CI/CD Ready** - Works in automated CI/CD pipelines
✅ **Video Recording** - Records videos of failed tests for analysis

## Test Coverage

The RPA suite includes the following test modules:

### 1. **Authentication Tests** (`auth.spec.ts`)
- Login page loading
- Login form element visibility
- Invalid credentials error handling
- Valid login flow
- Session persistence
- Logout functionality

### 2. **Dashboard Tests** (`dashboard.spec.ts`)
- Dashboard loading and rendering
- Navigation sidebar display
- Dashboard cards and statistics
- Module navigation
- Responsive design (mobile & desktop)
- Page title validation
- Console error checking
- Page refresh handling

### 3. **Employee Management Tests** (`employee.spec.ts`)
- Navigation to employee list
- Employee list/table display
- Search functionality
- Filter functionality
- Employee details view
- Export functionality
- Create/Add employee flow
- Form validation
- Employee statistics
- Pagination handling

### 4. **Leave Management Tests** (`leave.spec.ts`)
- Leave module navigation
- Leave balance display
- Apply leave functionality
- Leave type selection
- Date range picker
- My leaves list
- Leave status/history
- Approval workflow
- Leave cancellation
- Leave encashment

### 5. **Navigation and Module Tests** (`navigation.spec.ts`)
- Attendance module navigation
- Payroll module navigation
- Recruitment module navigation
- Asset management navigation
- Analytics module navigation
- Settings navigation
- Breadcrumb functionality
- Link and button accessibility
- Back button handling
- Search functionality
- 404 error handling

## Installation

### Prerequisites
- Node.js 18+ 
- npm 9+

### Setup

1. **Install Playwright**:
```bash
npm install --save-dev @playwright/test
```

2. **Install browsers** (one-time):
```bash
npx playwright install
```

## Running Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run tests with browser visible:
```bash
npm run test:e2e:headed
```

### Run tests in UI mode (interactive):
```bash
npm run test:e2e:ui
```

### Debug tests:
```bash
npm run test:e2e:debug
```

### View test results:
```bash
npm run test:e2e:report
```

## Test Reports

After running tests, a comprehensive HTML report is generated in two locations:

### 1. **Main Report**: `test-results/HRMS-TEST-REPORT.html`
- Beautiful visual report with statistics
- Test results organized by module
- Screenshots of failures
- Duration metrics
- Success rate percentage

### 2. **Playwright HTML Report**: `test-results/index.html`
- Native Playwright report
- Video recordings of failed tests
- Detailed error messages
- Test trace information

## Configuration

### Playwright Configuration (`playwright.config.ts`)

Key settings:
```typescript
- baseURL: http://localhost:5173 (your app URL)
- workers: 1 (single worker for stable testing)
- screenshot: 'only-on-failure' (capture failures)
- video: 'retain-on-failure' (record failures)
- trace: 'on-first-retry' (trace on retry)
```

### Test Data (`tests/e2e/fixtures/testdata.ts`)

Update test credentials and data:
```typescript
export const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin@123456',
    role: 'admin',
  },
  // ... other users
};
```

## Test Execution Flow

1. **Pre-test**: Web server starts automatically
2. **Authentication**: User logs in
3. **Module Testing**: Tests navigate through modules
4. **Verification**: Elements are checked for visibility and functionality
5. **Failure Handling**: Screenshots captured on failures
6. **Report Generation**: HTML report created with results

## Understanding Test Results

### Passed Tests ✓
- Green indicator
- Module/feature is working correctly
- No screenshots attached

### Failed Tests ✗
- Red indicator
- Shows error message
- Screenshots attached
- Video recording available

### Skipped Tests ⊝
- Yellow indicator
- Test was not executed (usually optional features)
- Not counted as failures

## Debugging Failed Tests

### Step 1: Check the Report
Open `test-results/HRMS-TEST-REPORT.html` and look for:
- Error message details
- Screenshot of failure
- Test duration

### Step 2: Run in Headed Mode
```bash
npm run test:e2e:headed
```
This shows the browser during test execution.

### Step 3: Debug Mode
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector to step through tests.

### Step 4: Check Videos
Open `test-results/index.html` to watch video recordings of failures.

## Best Practices

### 1. **Wait Times**
Tests include strategic waits for page loads:
```typescript
await page.waitForTimeout(2000); // Wait for navigation
```

### 2. **Flexible Selectors**
Tests use multiple selector strategies for reliability:
```typescript
const link = page.locator('a:has-text("Login"), [href*="login"]').first();
```

### 3. **Error Handling**
Tests gracefully handle optional elements:
```typescript
if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
  // Element exists, test it
}
```

### 4. **Responsive Testing**
Tests validate multiple screen sizes:
```typescript
await page.setViewportSize({ width: 375, height: 667 }); // Mobile
await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-report
    path: test-results/
```

### Environment Variables
Set in CI environment:
```bash
CI=true  # Enables retry logic
```

## Extending Tests

### Add a New Test Suite

1. Create new file: `tests/e2e/mymodule.spec.ts`
2. Use existing patterns:
```typescript
import { test, expect } from '@playwright/test';

test.describe('My Module Tests', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/my-module');
    await expect(page.locator('h1')).toContainText('My Module');
  });
});
```

3. Run tests: `npm run test:e2e`

### Common Selectors

```typescript
// By text
page.locator('text=Button Text')

// By role
page.locator('button[role="button"]')

// By aria-label
page.locator('[aria-label="Close"]')

// By CSS class
page.locator('.button-primary')

// By data attribute
page.locator('[data-testid="submit-btn"]')
```

## Troubleshooting

### Issue: Tests timeout
**Solution**: Increase timeout in specific tests:
```typescript
await page.waitForURL(/dashboard/, { timeout: 30000 });
```

### Issue: Cannot find element
**Solution**: Add debug output:
```typescript
await page.pause(); // Pause and inspect
```

### Issue: Application not loading
**Solution**: Check `baseURL` in `playwright.config.ts` matches your app URL.

### Issue: Screenshots not captured
**Solution**: Ensure `screenshot: 'only-on-failure'` is set in config.

## Performance Metrics

Expected test execution times:
- Auth Tests: ~30 seconds
- Dashboard Tests: ~45 seconds
- Employee Tests: ~60 seconds
- Leave Tests: ~50 seconds
- Navigation Tests: ~40 seconds

**Total**: ~3-5 minutes for full suite

## Report Statistics

The generated report includes:
- Total test count
- Pass/fail/skip breakdown
- Success rate percentage
- Individual test durations
- Error messages for failures
- Screenshots of failed states

## Support & Documentation

- **Playwright Docs**: https://playwright.dev
- **Config Reference**: https://playwright.dev/docs/test-configuration
- **API Reference**: https://playwright.dev/docs/api/class-page

## Next Steps

1. ✅ Run tests: `npm run test:e2e`
2. ✅ View report: `npm run test:e2e:report`
3. ✅ Debug failures: `npm run test:e2e:headed`
4. ✅ Extend tests for your features
5. ✅ Integrate into CI/CD pipeline

---

**Generated**: August 2026
**Framework**: Playwright v1.40+
**Node**: 18.0.0+
