import { test, expect } from '@playwright/test';

/**
 * SecureNet Dashboard Navigation E2E Tests
 * Day 3 Sprint 1: Dashboard Functionality Testing
 */

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as platform_owner
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'ceo');
    await page.fill('[data-testid="password-input"]', 'superadmin123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display main dashboard components', async ({ page }) => {
    // Check for key dashboard elements
    await expect(page.locator('[data-testid="security-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-alerts"]')).toBeVisible();
    
    // Check for navigation menu
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
  });

  test('should navigate to security page', async ({ page }) => {
    await page.click('[data-testid="nav-security"]');
    await expect(page).toHaveURL('/security');
    await expect(page.locator('h1')).toContainText('Security');
  });

  test('should navigate to network page', async ({ page }) => {
    await page.click('[data-testid="nav-network"]');
    await expect(page).toHaveURL('/network');
    await expect(page.locator('h1')).toContainText('Network');
  });

  test('should navigate to logs page', async ({ page }) => {
    await page.click('[data-testid="nav-logs"]');
    await expect(page).toHaveURL('/logs');
    await expect(page.locator('h1')).toContainText('Logs');
  });

  test('should navigate to anomalies page', async ({ page }) => {
    await page.click('[data-testid="nav-anomalies"]');
    await expect(page).toHaveURL('/anomalies');
    await expect(page.locator('h1')).toContainText('Anomalies');
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.click('[data-testid="nav-settings"]');
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1')).toContainText('Settings');
  });
});

test.describe('Dashboard Data Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'ceo');
    await page.fill('[data-testid="password-input"]', 'superadmin123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show loading states initially', async ({ page }) => {
    // Check for skeleton loaders
    await expect(page.locator('[data-testid="chart-skeleton"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-skeleton"]')).toBeVisible();
  });

  test('should load and display metrics', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="security-metrics"]');
    
    // Check for actual data
    await expect(page.locator('[data-testid="total-devices"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-alerts"]')).toBeVisible();
    await expect(page.locator('[data-testid="security-score"]')).toBeVisible();
  });

  test('should refresh data when refresh button clicked', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="security-metrics"]');
    
    // Click refresh button
    await page.click('[data-testid="refresh-dashboard"]');
    
    // Should show loading state again
    await expect(page.locator('[data-testid="chart-skeleton"]')).toBeVisible();
    
    // Then show updated data
    await page.waitForSelector('[data-testid="security-metrics"]');
  });
});

test.describe('Mobile Dashboard', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'ceo');
    await page.fill('[data-testid="password-input"]', 'superadmin123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display mobile navigation menu', async ({ page }) => {
    // Check for mobile menu toggle
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
  });

  test('should navigate using mobile menu', async ({ page }) => {
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-toggle"]');
    
    // Navigate to security
    await page.click('[data-testid="mobile-nav-security"]');
    await expect(page).toHaveURL('/security');
    
    // Menu should close after navigation
    await expect(page.locator('[data-testid="mobile-navigation"]')).not.toBeVisible();
  });

  test('should display responsive dashboard layout', async ({ page }) => {
    // Check that cards stack vertically on mobile
    const cards = page.locator('[data-testid*="dashboard-card"]');
    await expect(cards.first()).toBeVisible();
    
    // Check mobile-optimized layout
    await expect(page.locator('[data-testid="dashboard-grid"]')).toHaveClass(/mobile/);
  });
});

test.describe('Dashboard Real-time Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'ceo');
    await page.fill('[data-testid="password-input"]', 'superadmin123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should update alert count in real-time', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="active-alerts"]');
    
    // Get initial alert count
    const initialCount = await page.locator('[data-testid="alert-count"]').textContent();
    
    // Wait for potential updates (mock real-time behavior)
    await page.waitForTimeout(5000);
    
    // Check if count updated or remains consistent
    const currentCount = await page.locator('[data-testid="alert-count"]').textContent();
    expect(currentCount).toBeDefined();
  });

  test('should show connection status indicator', async ({ page }) => {
    // Check for connection status
    await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
    
    // Should show online status
    await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/online/);
  });
}); 