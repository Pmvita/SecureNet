import { test, expect } from '@playwright/test';

/**
 * SecureNet Authentication Flow E2E Tests
 * Day 3 Sprint 1: Critical User Journey Testing
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    // Test successful login flow
    await page.fill('[data-testid="username-input"]', 'ceo');
    await page.fill('[data-testid="password-input"]', 'superadmin123');
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Should show user menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Should display welcome message or dashboard content
    await expect(page.locator('h1, h2')).toContainText(['Dashboard', 'Welcome', 'Security']);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="username-input"]', 'invalid');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid');
    
    // Should remain on login page
    await expect(page).toHaveURL('/login');
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('[data-testid="login-button"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="username-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route directly
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'platform123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Open user menu and logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Should not be able to access dashboard anymore
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Role-Based Access Control', () => {
  test('platform_owner should access admin features', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'ceo');
    await page.fill('[data-testid="password-input"]', 'superadmin123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Should see admin navigation
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
    
    // Should be able to access admin pages
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('Admin');
  });

  test('security_admin should have limited admin access', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'platform123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Should see some admin features
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
  });

  test('soc_analyst should have limited access', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'user');
    await page.fill('[data-testid="password-input"]', 'enduser123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Should NOT see admin navigation
    await expect(page.locator('[data-testid="admin-nav"]')).not.toBeVisible();
    
    // Should be denied access to admin pages
    await page.goto('/admin');
    await expect(page).not.toHaveURL('/admin');
  });
}); 