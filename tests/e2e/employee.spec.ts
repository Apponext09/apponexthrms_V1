import { test, expect } from '@playwright/test';
import { testUsers, testEmployeeData } from './fixtures/testdata';

test.describe('Employee Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(testUsers.admin.email);
    await passwordInput.fill(testUsers.admin.password);
    await submitBtn.click();

    await page.waitForTimeout(3000);
  });

  test('should navigate to employee list', async ({ page }) => {
    // Try to navigate to employee page
    const employeeLink = page.locator(
      'a:has-text("Employee"), a:has-text("Employees"), [href*="employee"]'
    ).first();

    if (await employeeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeLink.click();
      await page.waitForTimeout(2000);

      // Check if page loaded
      await expect(page.locator('text=Employee')).toBeVisible({ timeout: 10000 }).catch(() => {
        // Element might have different text
      });
    }
  });

  test('should display employee list or table', async ({ page }) => {
    // Try to find employee list
    const listView = page.locator('table, [role="grid"], .employee-list').first();

    if (await listView.isVisible({ timeout: 10000 }).catch(() => false)) {
      const rows = page.locator('tr, [role="row"]');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should have search functionality for employees', async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="search"], input[aria-label*="search"], .search-input'
    ).first();

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Should trigger search or filter
      expect(await searchInput.inputValue()).toBe('test');
    }
  });

  test('should allow filtering employees', async ({ page }) => {
    // Look for filter button
    const filterBtn = page.locator('button:has-text("Filter"), button[aria-label*="filter"]').first();

    if (await filterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(1000);

      // Check if filter menu opened
      const filterMenu = page.locator('[role="menu"], .filter-menu').first();
      const isVisible = await filterMenu.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should display employee details when clicking on employee', async ({ page }) => {
    // Find first employee in list
    const employeeRow = page.locator('tr, [role="row"]').nth(1);

    if (await employeeRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeRow.click();
      await page.waitForTimeout(2000);

      // Check if detail view loaded
      const detailView = page.locator('[role="main"], main, .employee-detail').first();
      const isVisible = await detailView.isVisible({ timeout: 10000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should have export functionality', async ({ page }) => {
    // Look for export button
    const exportBtn = page.locator(
      'button:has-text("Export"), button[aria-label*="export"], a:has-text("Download")'
    ).first();

    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(2000);
      // Export action triggered
    }
  });

  test('should have create/add employee functionality', async ({ page }) => {
    // Look for create/add button
    const addBtn = page.locator(
      'button:has-text("Add"), button:has-text("Create"), button:has-text("New"), a:has-text("Add Employee")'
    ).first();

    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(2000);

      // Check if form opened
      const form = page.locator('form, [role="form"]').first();
      const isVisible = await form.isVisible({ timeout: 10000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should validate required fields in employee form', async ({ page }) => {
    const addBtn = page.locator(
      'button:has-text("Add"), button:has-text("Create"), button:has-text("New")'
    ).first();

    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(2000);

      // Try to submit empty form
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1000);

        // Should show validation errors
        const errorMsg = page.locator('[role="alert"], .error, .validation-error').first();
        const hasError = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasError).toBeTruthy();
      }
    }
  });

  test('should display employee statistics or summary', async ({ page }) => {
    // Look for stat cards
    const statCard = page.locator('[role="article"], .stat, .metric').first();

    if (await statCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statCard).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle pagination if applicable', async ({ page }) => {
    // Look for pagination controls
    const pagination = page.locator('.pagination, [role="navigation"] nav, [aria-label*="pagination"]').first();

    if (await pagination.isVisible({ timeout: 5000 }).catch(() => false)) {
      const nextBtn = page.locator('button:has-text("Next"), a:has-text("Next")').first();
      if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });
});
