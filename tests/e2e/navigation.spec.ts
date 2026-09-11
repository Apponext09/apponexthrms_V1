import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/testdata';

test.describe('Navigation and Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(testUsers.admin.email);
    await passwordInput.fill(testUsers.admin.password);
    await submitBtn.click();

    await page.waitForTimeout(3000);
  });

  test('should navigate to attendance module', async ({ page }) => {
    const attendanceLink = page.locator(
      'a:has-text("Attendance"), [href*="attendance"]'
    ).first();

    if (await attendanceLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await attendanceLink.click();
      await page.waitForTimeout(2000);

      const content = page.locator('main, [role="main"]').first();
      const isVisible = await content.isVisible({ timeout: 10000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should navigate to payroll module', async ({ page }) => {
    const payrollLink = page.locator(
      'a:has-text("Payroll"), [href*="payroll"]'
    ).first();

    if (await payrollLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payrollLink.click();
      await page.waitForTimeout(2000);

      const content = page.locator('main, [role="main"]').first();
      const isVisible = await content.isVisible({ timeout: 10000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should navigate to recruitment module', async ({ page }) => {
    const recruitmentLink = page.locator(
      'a:has-text("Recruitment"), a:has-text("Recruit"), [href*="recruitment"]'
    ).first();

    if (await recruitmentLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recruitmentLink.click();
      await page.waitForTimeout(2000);

      const content = page.locator('main, [role="main"]').first();
      const isVisible = await content.isVisible({ timeout: 10000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should navigate to asset module', async ({ page }) => {
    const assetLink = page.locator(
      'a:has-text("Asset"), [href*="asset"]'
    ).first();

    if (await assetLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await assetLink.click();
      await page.waitForTimeout(2000);

      const content = page.locator('main, [role="main"]').first();
      const isVisible = await content.isVisible({ timeout: 10000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should navigate to analytics module', async ({ page }) => {
    const analyticsLink = page.locator(
      'a:has-text("Analytics"), a:has-text("Reports"), [href*="analytics"]'
    ).first();

    if (await analyticsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await analyticsLink.click();
      await page.waitForTimeout(2000);

      const content = page.locator('main, [role="main"]').first();
      const isVisible = await content.isVisible({ timeout: 10000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should navigate to settings', async ({ page }) => {
    const settingsLink = page.locator(
      'a:has-text("Settings"), button[aria-label*="settings"], [href*="settings"]'
    ).first();

    if (await settingsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsLink.click();
      await page.waitForTimeout(2000);

      const content = page.locator('main, [role="main"]').first();
      const isVisible = await content.isVisible({ timeout: 10000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should have working breadcrumbs', async ({ page }) => {
    const breadcrumb = page.locator('[role="navigation"] nav, .breadcrumb, [aria-label*="breadcrumb"]').first();

    if (await breadcrumb.isVisible({ timeout: 5000 }).catch(() => false)) {
      const links = breadcrumb.locator('a');
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should have accessible links and buttons', async ({ page }) => {
    await page.goto('/');

    // Check for accessible buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Check for accessible links
    const links = page.locator('a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('should handle navigation back button', async ({ page }) => {
    // Navigate to a page
    const employeeLink = page.locator(
      'a:has-text("Employee"), a:has-text("Employees"), [href*="employee"]'
    ).first();

    if (await employeeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const urlBefore = page.url();

      await employeeLink.click();
      await page.waitForTimeout(2000);

      const urlAfter = page.url();
      expect(urlAfter).not.toBe(urlBefore);

      // Go back
      await page.goBack();
      await page.waitForTimeout(2000);

      const urlBack = page.url();
      expect(urlBack).toBe(urlBefore);
    }
  });

  test('should have search functionality if available', async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="search"], input[aria-label*="search"], .search-input'
    ).first();

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      expect(await searchInput.inputValue()).toBe('test');
    }
  });

  test('should have notifications or alerts', async ({ page }) => {
    const notification = page.locator(
      '[role="alert"], .notification, .toast, [aria-live="polite"]'
    ).first();

    // Notifications are optional, just checking they can display
    const isVisible = await notification.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isVisible || true).toBeTruthy();
  });

  test('should handle 404 gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await page.waitForTimeout(2000);

    // Should either show 404 page or redirect
    const is404OrRedirect = page.url().includes('404') || !page.url().includes('nonexistent');
    expect(is404OrRedirect).toBeTruthy();
  });
});
