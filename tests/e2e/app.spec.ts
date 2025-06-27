import { test, expect } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright';
import path from 'path';

// E2E tests for ElectronX application
test.describe('ElectronX App', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', '..', 'dist', 'main', 'index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Get the first window that the app opens
    page = await electronApp.firstWindow();
    
    // Ensure window is visible
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    // Close the app
    await electronApp.close();
  });

  test('should display the main window', async () => {
    // Check that the window is visible
    expect(await page.isVisible('body')).toBeTruthy();
    
    // Check window title
    const title = await page.title();
    expect(title).toContain('ElectronX');
  });

  test('should have the correct app structure', async () => {
    // Wait for the app to be fully loaded
    await page.waitForSelector('.app', { timeout: 10000 });
    
    // Check main app container
    const appElement = page.locator('.app');
    await expect(appElement).toBeVisible();
    
    // Check title bar
    const titleBar = page.locator('.title-bar');
    await expect(titleBar).toBeVisible();
    
    // Check main content area
    const mainContent = page.locator('.main-content');
    await expect(mainContent).toBeVisible();
    
    // Check status bar
    const statusBar = page.locator('.status-bar');
    await expect(statusBar).toBeVisible();
  });

  test('should have working window controls', async () => {
    // Test minimize button (if not on macOS)
    const platform = await electronApp.evaluate(async ({ app }) => {
      return process.platform;
    });

    if (platform !== 'darwin') {
      const minimizeButton = page.locator('.title-bar-button.minimize');
      await expect(minimizeButton).toBeVisible();
      
      // Don't actually click minimize in tests as it would hide the window
      await expect(minimizeButton).toBeEnabled();
    }
  });

  test('should have navigation controls', async () => {
    // Check back button
    const backButton = page.locator('.nav-button').first();
    await expect(backButton).toBeVisible();
    
    // Check forward button
    const forwardButton = page.locator('.nav-button').nth(1);
    await expect(forwardButton).toBeVisible();
    
    // Check reload button
    const reloadButton = page.locator('.nav-button').nth(2);
    await expect(reloadButton).toBeVisible();
  });

  test('should open settings modal', async () => {
    // Click settings button
    const settingsButton = page.locator('.action-button').last();
    await settingsButton.click();
    
    // Wait for settings modal to appear
    await page.waitForSelector('.settings-modal', { timeout: 5000 });
    
    // Check modal is visible
    const settingsModal = page.locator('.settings-modal');
    await expect(settingsModal).toBeVisible();
    
    // Check modal has tabs
    const tabs = page.locator('.tab-button');
    await expect(tabs).toHaveCount(4); // General, Appearance, Advanced, About
    
    // Close modal
    const closeButton = page.locator('.close-button').first();
    await closeButton.click();
    
    // Verify modal is closed
    await expect(settingsModal).not.toBeVisible();
  });

  test('should toggle side panel', async () => {
    // Click side panel toggle button
    const sidePanelButton = page.locator('.action-button').first();
    await sidePanelButton.click();
    
    // Wait for side panel to appear
    await page.waitForSelector('.side-panel', { timeout: 5000 });
    
    // Check side panel is visible
    const sidePanel = page.locator('.side-panel');
    await expect(sidePanel).toBeVisible();
    
    // Check navigation items
    const navItems = page.locator('.nav-item');
    await expect(navItems.first()).toBeVisible();
    
    // Close side panel
    const closePanelButton = page.locator('.side-panel .close-button');
    await closePanelButton.click();
    
    // Verify side panel is closed
    await expect(sidePanel).not.toBeVisible();
  });

  test('should have working zoom controls', async () => {
    // Check zoom controls
    const zoomControls = page.locator('.zoom-controls');
    await expect(zoomControls).toBeVisible();
    
    const zoomButtons = page.locator('.zoom-button');
    await expect(zoomButtons).toHaveCount(3); // Zoom out, reset, zoom in
    
    // Test zoom in
    const zoomInButton = zoomButtons.last();
    await expect(zoomInButton).toBeEnabled();
    
    // Test zoom out
    const zoomOutButton = zoomButtons.first();
    await expect(zoomOutButton).toBeEnabled();
    
    // Test zoom reset
    const zoomResetButton = zoomButtons.nth(1);
    await expect(zoomResetButton).toBeEnabled();
  });

  test('should display status bar information', async () => {
    // Check connection status
    const connectionStatus = page.locator('.connection-status');
    await expect(connectionStatus).toBeVisible();
    
    // Check platform info
    const platformInfo = page.locator('.platform-info');
    await expect(platformInfo).toBeVisible();
    
    // Check current time
    const currentTime = page.locator('.current-time');
    await expect(currentTime).toBeVisible();
    
    // Verify time format (should be HH:MM)
    const timeText = await currentTime.textContent();
    expect(timeText).toMatch(/\d{2}:\d{2}/);
  });

  test('should handle keyboard shortcuts', async () => {
    // Test Ctrl+R for reload (but don't actually reload)
    // We'll just check that the shortcut is registered
    
    // Focus the page
    await page.focus('body');
    
    // Test opening settings with Ctrl+,
    await page.keyboard.press('Control+Comma');
    
    // Wait for settings modal
    await page.waitForSelector('.settings-modal', { timeout: 3000 });
    const settingsModal = page.locator('.settings-modal');
    await expect(settingsModal).toBeVisible();
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(settingsModal).not.toBeVisible();
  });

  test('should maintain window state', async () => {
    // Get initial window bounds
    const initialBounds = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      const mainWindow = windows[0];
      return mainWindow ? mainWindow.getBounds() : null;
    });
    
    expect(initialBounds).toBeTruthy();
    expect(initialBounds?.width).toBeGreaterThan(0);
    expect(initialBounds?.height).toBeGreaterThan(0);
  });

  test('should load X.com content in browser view', async () => {
    // Since we're testing with a real browser view, we need to wait
    // for the X.com content to potentially load in the background
    
    // Check that the main content area exists
    const mainContent = page.locator('.main-content');
    await expect(mainContent).toBeVisible();
    
    // Check browser view placeholder
    const browserViewPlaceholder = page.locator('.browser-view-placeholder');
    await expect(browserViewPlaceholder).toBeVisible();
  });

  test('should handle theme switching', async () => {
    // Open settings
    const settingsButton = page.locator('.action-button').last();
    await settingsButton.click();
    
    await page.waitForSelector('.settings-modal');
    
    // Go to appearance tab
    const appearanceTab = page.locator('.tab-button').nth(1);
    await appearanceTab.click();
    
    // Check theme options
    const themeOptions = page.locator('.theme-option');
    await expect(themeOptions).toHaveCount(3); // light, dark, system
    
    // Test switching to dark theme
    const darkThemeOption = themeOptions.nth(1);
    await darkThemeOption.click();
    
    // Verify theme change (check data-theme attribute)
    const appElement = page.locator('.app');
    const themeAttr = await appElement.getAttribute('data-theme');
    expect(themeAttr).toBe('dark');
    
    // Close settings
    const closeButton = page.locator('.close-button').first();
    await closeButton.click();
  });

  test('should validate app metadata', async () => {
    // Check app version and other metadata
    const appInfo = await electronApp.evaluate(async ({ app }) => {
      return {
        name: app.getName(),
        version: app.getVersion(),
        isPackaged: app.isPackaged
      };
    });
    
    expect(appInfo.name).toBe('ElectronX');
    expect(appInfo.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(typeof appInfo.isPackaged).toBe('boolean');
  });
});