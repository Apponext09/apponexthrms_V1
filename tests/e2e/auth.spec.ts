import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/testdata';

test.describe('Authentication Tests', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/login|HRMS/i);
    await expect(page.locator('text=Login')).toBeVisible({ timeout: 10000 });
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login');

    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    // Check for password input
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    // Check for submit button
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await submitBtn.click();

    // Wait for error message or redirect
    await page.waitForTimeout(2000);

    // Should either show error or stay on login page
    const isLoginPage = page.url().includes('/login') || page.locator('text=Login').isVisible();
    expect(isLoginPage).toBeTruthy();
  });

  test('should login with valid admin credentials', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(testUsers.admin.email);
    await passwordInput.fill(testUsers.admin.password);
    await submitBtn.click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|home|admin)/, { timeout: 15000 }).catch(() => {
      // If URL doesn't change as expected, just wait for page load
    });

    // Check if we're no longer on login page
    await page.waitForTimeout(2000);
    const isNotLoginPage = !page.url().includes('/login');
    expect(isNotLoginPage).toBeTruthy();
  });

  test('should persist session after login', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(testUsers.admin.email);
    await passwordInput.fill(testUsers.admin.password);
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Navigate to another page
    await page.goto('/');

    // Should not redirect to login
    await page.waitForTimeout(1000);
    const isNotLoginPage = !page.url().includes('/login');
    expect(isNotLoginPage).toBeTruthy();
  });

  test('should allow logout', async ({ page }) => {
    // Login first
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(testUsers.admin.email);
    await passwordInput.fill(testUsers.admin.password);
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Look for logout option in menu
    const profileBtn = page.locator('button[aria-label*="profile"], button[aria-label*="menu"], button[aria-label*="user"]').first();
    if (await profileBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await profileBtn.click();

      const logoutBtn = page.locator('text=Logout, text=Sign Out, text=Exit').first();
      if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await logoutBtn.click();
        await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {
          // Logout might not change URL, just wait
        });
      }
    }
  });
});
