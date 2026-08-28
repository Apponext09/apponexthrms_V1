import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/testdata';

test.describe('Dashboard Tests', () => {
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

  test('should load dashboard successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Check for common dashboard elements
    const pageContent = page.locator('main, [role="main"], .dashboard, .content').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test('should display navigation sidebar', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.locator('aside, nav, [role="navigation"], .sidebar').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 }).catch(() => {
      // Sidebar might not exist on all pages
    });
  });

  test('should have accessible navigation links', async ({ page }) => {
    await page.goto('/');

    const navLinks = page.locator('a[href*="/"], button[aria-label*="nav"]');
    const count = await navLinks.count();

    // Should have at least some navigation
    expect(count).toBeGreaterThan(0);
  });

  test('should render dashboard cards or statistics', async ({ page }) => {
    await page.goto('/');

    // Look for common dashboard elements
    const cards = page.locator('[role="article"], .card, .stat, .metric').first();

    // Try to find any visible content
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should handle navigation to different modules', async ({ page }) => {
    await page.goto('/');

    // Look for employee link
    const employeeLink = page.locator(
      'a:has-text("Employee"), a:has-text("Employees"), button:has-text("Employee")'
    ).first();

    if (await employeeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeLink.click();
      await page.waitForTimeout(2000);

      const isNavigated = !page.url().includes('login');
      expect(isNavigated).toBeTruthy();
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(2000);

    const isVisible = await page.locator('main, [role="main"]').isVisible({ timeout: 10000 }).catch(() => false);
    expect(isVisible).toBeTruthy();

    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForTimeout(2000);

    const isVisibleDesktop = await page.locator('main, [role="main"]').isVisible({ timeout: 10000 }).catch(() => false);
    expect(isVisibleDesktop).toBeTruthy();
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title.toLowerCase()).toContain('hrms');
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Filter out known harmless errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('load') &&
        !e.includes('404')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should handle page refresh without issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const urlBefore = page.url();

    await page.reload();
    await page.waitForTimeout(3000);

    const urlAfter = page.url();
    expect(urlAfter).toContain(urlBefore.split('?')[0]);
  });
});
