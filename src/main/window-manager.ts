import { BrowserWindow, screen, shell, nativeTheme, app, BrowserView } from 'electron';
import { join } from 'path';
import windowStateKeeper from 'electron-window-state';
import log from 'electron-log';

import { AppSettings, WindowState } from '../shared/types/ipc';
import { AppWindow, WindowConfig } from '../shared/types/app';
import { WINDOW_CONFIG, APP_CONFIG, FEATURE_FLAGS } from '../shared/constants/config';
import { Platform, isDevelopment } from '../shared/utils/platform';
import { DEFAULT_URL } from '../shared/constants/urls';
import { isAllowedDomain } from '../shared/utils/validation';
import { AuthDetector, AuthState } from './services/auth-detector';
import { MessageCounter, MessageCount } from './services/message-counter';
import { BadgeManager } from './services/badge-manager';

export class WindowManager {
  private windows: Map<number, AppWindow> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private browserView: BrowserView | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private aboutWindow: BrowserWindow | null = null;
  private authDetector: AuthDetector | null = null;
  private messageCounter: MessageCounter | null = null;
  private badgeManager: BadgeManager | null = null;

  constructor() {
    this.setupWindowEvents();
  }

  private setupWindowEvents(): void {
    app.on('browser-window-created', (_, window) => {
      this.registerWindow(window);
    });

    app.on('browser-window-focus', (_, window) => {
      log.debug('Window focused:', window.id);
    });

    app.on('browser-window-blur', (_, window) => {
      log.debug('Window blurred:', window.id);
    });
  }

  private registerWindow(window: BrowserWindow): void {
    const appWindow: AppWindow = {
      id: window.id,
      window,
      type: this.getWindowType(window),
      isReady: false,
      isDestroyed: false
    };

    this.windows.set(window.id, appWindow);

    window.on('ready-to-show', () => {
      appWindow.isReady = true;
      log.debug('Window ready to show:', window.id);
    });

    window.on('closed', () => {
      appWindow.isDestroyed = true;
      this.windows.delete(window.id);
      log.debug('Window closed:', window.id);
    });

    window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      log.error('Window failed to load:', { errorCode, errorDescription, validatedURL });
    });

    window.webContents.on('crashed', (event, killed) => {
      log.error('Window crashed:', { windowId: window.id, killed });
      this.handleWindowCrash(window);
    });

    window.webContents.on('unresponsive', () => {
      log.warn('Window became unresponsive:', window.id);
    });

    window.webContents.on('responsive', () => {
      log.info('Window became responsive again:', window.id);
    });
  }

  private getWindowType(window: BrowserWindow): 'main' | 'settings' | 'about' {
    if (window === this.mainWindow) return 'main';
    if (window === this.settingsWindow) return 'settings';
    if (window === this.aboutWindow) return 'about';
    return 'main';
  }

  private handleWindowCrash(window: BrowserWindow): void {
    const appWindow = this.windows.get(window.id);
    if (!appWindow) return;

    if (appWindow.type === 'main') {
      log.error('Main window crashed, attempting to recreate...');
      setTimeout(() => {
        this.createMainWindow();
      }, 1000);
    }
  }

  private getWindowConfig(): WindowConfig {
    log.debug('Getting primary display...');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    log.debug('Screen size:', { screenWidth, screenHeight });

    const config = {
      width: Math.min(WINDOW_CONFIG.DEFAULT_WIDTH, screenWidth - 100),
      height: Math.min(WINDOW_CONFIG.DEFAULT_HEIGHT, screenHeight - 100),
      minWidth: WINDOW_CONFIG.MIN_WIDTH,
      minHeight: WINDOW_CONFIG.MIN_HEIGHT,
      title: APP_CONFIG.APP_NAME,
      icon: this.getAppIcon(),
      show: false,
      autoHideMenuBar: true,
      // Simplify titleBarStyle to see if it's causing issues
      titleBarStyle: 'default' as const,
      // Remove trafficLightPosition for now
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '..', '..', 'dist', 'renderer', 'preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      }
    };
    
    log.debug('Window config created:', JSON.stringify(config, null, 2));
    return config;
  }

  private getAppIcon(): string | undefined {
    // Try the RGB version first, fallback to original, then disable completely
    const rgbIconPath = join(__dirname, '..', '..', 'assets', 'x-logo', 'app-icon-rgb-512.png');
    const originalIconPath = join(__dirname, '..', '..', 'assets', 'x-logo', 'app-icon-final-512.png');
    
    try {
      const fs = require('fs');
      if (fs.existsSync(rgbIconPath)) {
        log.debug('Using RGB icon:', rgbIconPath);
        return rgbIconPath;
      } else if (fs.existsSync(originalIconPath)) {
        log.debug('Using original icon:', originalIconPath);
        return originalIconPath;
      } else {
        log.debug('No icon files found, using no icon');
        return undefined;
      }
    } catch (error) {
      log.error('Error checking icon files:', error);
      return undefined;
    }
  }

  public async createMainWindow(): Promise<BrowserWindow> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.focus();
      return this.mainWindow;
    }

    log.info('Creating main window...');

    let mainWindowState: any;
    
    try {
      // Load window state
      log.debug('Loading window state...');
      mainWindowState = windowStateKeeper({
        defaultWidth: WINDOW_CONFIG.DEFAULT_WIDTH,
        defaultHeight: WINDOW_CONFIG.DEFAULT_HEIGHT
      });
      log.debug('Window state loaded successfully');

      log.debug('Getting window config...');
      const config = this.getWindowConfig();
      log.debug('Window config:', config);
      
      log.debug('Creating BrowserWindow...');
      this.mainWindow = new BrowserWindow({
        ...config,
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height
      });
      log.debug('BrowserWindow created successfully');
    } catch (error) {
      log.error('Error during window creation:', error);
      throw error;
    }

    // Manage window state
    if (mainWindowState) {
      mainWindowState.manage(this.mainWindow);
    }

    // Create browser view for X.com
    await this.createBrowserView();

    // Load the renderer
    const htmlPath = join(__dirname, '..', '..', 'dist', 'renderer', 'index.html');
    await this.mainWindow.loadFile(htmlPath);
    
    if (isDevelopment()) {
      this.mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Set up window events
    this.setupMainWindowEvents();

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      if (!this.mainWindow) return;
      
      this.mainWindow.show();
      this.mainWindow.focus();
      
      if (Platform.isMacOS) {
        app.dock.show();
      }
      
      log.info('Main window created and shown');
    });

    return this.mainWindow;
  }

  private async createBrowserView(): Promise<void> {
    if (!this.mainWindow) return;

    this.browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: 'persist:x-session'
      }
    });

    this.mainWindow.setBrowserView(this.browserView);
    
    // Set iPad Pro landscape user agent for better desktop interface
    const iPadProUserAgent = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    this.browserView.webContents.setUserAgent(iPadProUserAgent);
    
    // Position browser view
    this.updateBrowserViewBounds();

    // Set up browser view events
    this.setupBrowserViewEvents();

    // Load X.com
    await this.browserView.webContents.loadURL(DEFAULT_URL);

    // Initialize message services after browser view is ready
    this.initializeMessageServices();
  }

  private setupBrowserViewEvents(): void {
    if (!this.browserView) return;

    const webContents = this.browserView.webContents;

    webContents.on('did-navigate', (event, url) => {
      log.debug('Browser view navigated to:', url);
      this.updateWindowTitle(url);
    });

    webContents.on('did-navigate-in-page', (event, url) => {
      log.debug('Browser view navigated in page to:', url);
      this.updateWindowTitle(url);
    });

    webContents.setWindowOpenHandler(({ url }) => {
      if (isAllowedDomain(url)) {
        webContents.loadURL(url);
        return { action: 'deny' };
      } else {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    });

    webContents.on('will-navigate', (event, url) => {
      if (!isAllowedDomain(url)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    webContents.on('before-input-event', (event, input) => {
      // Handle keyboard shortcuts
      if (input.control || input.meta) {
        this.handleKeyboardShortcut(input);
      }
    });

    webContents.on('context-menu', (event, params) => {
      // Handle context menu
      this.showContextMenu(params);
    });

    webContents.on('page-title-updated', (event, title) => {
      this.updateWindowTitle(title);
    });

    webContents.on('dom-ready', () => {
      // Inject custom CSS if enabled
      this.injectCustomStyles();
    });
  }

  private setupMainWindowEvents(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on('resize', () => {
      this.updateBrowserViewBounds();
    });

    this.mainWindow.on('maximize', () => {
      this.updateBrowserViewBounds();
    });

    this.mainWindow.on('unmaximize', () => {
      this.updateBrowserViewBounds();
    });

    this.mainWindow.on('enter-full-screen', () => {
      this.updateBrowserViewBounds();
    });

    this.mainWindow.on('leave-full-screen', () => {
      this.updateBrowserViewBounds();
    });

    this.mainWindow.on('closed', () => {
      this.destroyMessageServices();
      this.mainWindow = null;
      this.browserView = null;
    });

    this.mainWindow.on('focus', () => {
      if (this.browserView) {
        this.browserView.webContents.focus();
      }
    });
  }

  private updateBrowserViewBounds(): void {
    if (!this.mainWindow || !this.browserView) return;

    const bounds = this.mainWindow.getContentBounds();
    
    this.browserView.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height
    });
  }

  private updateWindowTitle(urlOrTitle: string): void {
    if (!this.mainWindow) return;

    let title: string = APP_CONFIG.APP_NAME;
    
    if (urlOrTitle.startsWith('http')) {
      // Extract page info from URL
      try {
        const url = new URL(urlOrTitle);
        if (url.hostname.includes('x.com') || url.hostname.includes('twitter.com')) {
          title = `${APP_CONFIG.APP_NAME} - X`;
        }
      } catch {
        // Ignore URL parsing errors
      }
    } else {
      title = `${APP_CONFIG.APP_NAME} - ${urlOrTitle}`;
    }

    this.mainWindow.setTitle(title);
  }

  private handleKeyboardShortcut(input: any): void {
    const { key, control, meta, shift } = input;
    const cmdOrCtrl = Platform.isMacOS ? meta : control;

    if (cmdOrCtrl) {
      switch (key.toLowerCase()) {
        case 'r':
          this.reload();
          break;
        case 'f':
          this.toggleFullscreen();
          break;
        case 'j':
          if (shift) this.openDevTools();
          break;
        case '=':
        case '+':
          this.zoomIn();
          break;
        case '-':
          this.zoomOut();
          break;
        case '0':
          this.resetZoom();
          break;
      }
    }
  }

  private showContextMenu(params: any): void {
    // Implementation for context menu would go here
    log.debug('Context menu requested:', params);
  }

  private injectCustomStyles(): void {
    if (!this.browserView) return;

    const customCSS = `
      /* iPad Pro landscape viewport simulation */
      @media screen {
        html {
          /* Simulate iPad Pro 12.9" landscape: 1366x1024 */
          min-width: 1366px !important;
        }
      }
      
      /* Hide promoted tweets */
      [data-testid="placementTracking"] { display: none !important; }
      
      /* Clean up sidebar ads */
      [aria-label="Timeline: Trending now"] [data-testid="trend"] [data-testid="placementTracking"] {
        display: none !important;
      }
      
      /* Improve readability */
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        /* Ensure responsive layout works properly */
        min-width: 1366px !important;
      }
      
      /* Custom scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: var(--color-background-secondary);
      }
      
      ::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: var(--color-text-secondary);
      }
      
      /* Hide mobile-specific elements that might still show */
      [data-testid="BottomBar"],
      [aria-label="Bottom bar"] {
        display: none !important;
      }
    `;

    this.browserView.webContents.insertCSS(customCSS);
  }

  private initializeMessageServices(): void {
    if (!this.browserView || !this.mainWindow) return;

    try {
      // Initialize badge manager
      this.badgeManager = new BadgeManager(this.mainWindow);

      // Initialize auth detector
      this.authDetector = new AuthDetector(this.browserView);
      
      // Initialize message counter
      this.messageCounter = new MessageCounter(this.browserView);

      // Set up auth state monitoring
      this.authDetector.onAuthStateChange((authState: AuthState) => {
        log.info('Authentication state changed:', authState);
        
        if (authState.isAuthenticated) {
          // User is authenticated, start message polling
          if (this.messageCounter && !this.messageCounter.isCurrentlyPolling()) {
            log.info('User authenticated, starting message count polling');
            this.messageCounter.start();
          }
        } else {
          // User is not authenticated, stop message polling and clear badge
          if (this.messageCounter && this.messageCounter.isCurrentlyPolling()) {
            log.info('User not authenticated, stopping message count polling');
            this.messageCounter.stop();
          }
          if (this.badgeManager) {
            this.badgeManager.clearBadge();
          }
        }
      });

      // Set up message count monitoring
      this.messageCounter.onCountChange(async (messageCount: MessageCount) => {
        log.info('Message count updated:', messageCount);
        
        if (messageCount.success && this.badgeManager) {
          log.info('Updating badge count to:', messageCount.unreadCount);
          await this.badgeManager.updateBadge(messageCount.unreadCount);
          log.info('Badge update completed');
        } else if (!messageCount.success) {
          log.warn('Failed to get message count:', messageCount.error);
        }
      });

      // Start auth detection
      this.authDetector.start();

      log.info('Message services initialized successfully');

    } catch (error) {
      log.error('Failed to initialize message services:', error);
    }
  }

  private destroyMessageServices(): void {
    try {
      if (this.authDetector) {
        this.authDetector.destroy();
        this.authDetector = null;
      }

      if (this.messageCounter) {
        this.messageCounter.destroy();
        this.messageCounter = null;
      }

      if (this.badgeManager) {
        this.badgeManager.destroy();
        this.badgeManager = null;
      }

      log.debug('Message services destroyed');
    } catch (error) {
      log.error('Error destroying message services:', error);
    }
  }

  // Public methods for window control
  public loadUrl(url: string): void {
    if (!this.browserView) return;
    this.browserView.webContents.loadURL(url);
  }

  public reload(): void {
    if (!this.browserView) return;
    this.browserView.webContents.reload();
  }

  public goBack(): void {
    if (!this.browserView) return;
    if (this.browserView.webContents.canGoBack()) {
      this.browserView.webContents.goBack();
    }
  }

  public goForward(): void {
    if (!this.browserView) return;
    if (this.browserView.webContents.canGoForward()) {
      this.browserView.webContents.goForward();
    }
  }

  public toggleFullscreen(): void {
    if (!this.mainWindow) return;
    this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
  }

  public minimize(): void {
    if (!this.mainWindow) return;
    this.mainWindow.minimize();
  }

  public maximize(): void {
    if (!this.mainWindow) return;
    if (this.mainWindow.isMaximized()) {
      this.mainWindow.unmaximize();
    } else {
      this.mainWindow.maximize();
    }
  }

  public close(): void {
    if (!this.mainWindow) return;
    this.mainWindow.close();
  }

  public hide(): void {
    if (!this.mainWindow) return;
    this.mainWindow.hide();
  }

  public show(): void {
    if (!this.mainWindow) return;
    this.mainWindow.show();
  }

  public focus(): void {
    if (!this.mainWindow) return;
    this.mainWindow.focus();
  }

  public focusMainWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
    }
  }

  public hideAllWindows(): void {
    this.windows.forEach(appWindow => {
      if (!appWindow.isDestroyed) {
        appWindow.window.hide();
      }
    });
  }

  public openDevTools(): void {
    if (!this.browserView) return;
    this.browserView.webContents.openDevTools({ mode: 'detach' });
  }

  public closeDevTools(): void {
    if (!this.browserView) return;
    this.browserView.webContents.closeDevTools();
  }

  public zoomIn(): void {
    if (!this.browserView) return;
    const currentZoom = this.browserView.webContents.getZoomLevel();
    this.browserView.webContents.setZoomLevel(Math.min(currentZoom + 0.5, 3));
  }

  public zoomOut(): void {
    if (!this.browserView) return;
    const currentZoom = this.browserView.webContents.getZoomLevel();
    this.browserView.webContents.setZoomLevel(Math.max(currentZoom - 0.5, -3));
  }

  public resetZoom(): void {
    if (!this.browserView) return;
    this.browserView.webContents.setZoomLevel(0);
  }

  public setZoomLevel(level: number): void {
    if (!this.browserView) return;
    this.browserView.webContents.setZoomLevel(Math.max(-3, Math.min(3, level)));
  }

  public updateTheme(theme: 'light' | 'dark'): void {
    if (!this.browserView) return;
    
    nativeTheme.themeSource = theme;
    
    // Inject theme-specific CSS
    const themeCSS = theme === 'dark' ? `
      html { color-scheme: dark; }
    ` : `
      html { color-scheme: light; }
    `;
    
    this.browserView.webContents.insertCSS(themeCSS);
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public getBrowserView(): BrowserView | null {
    return this.browserView;
  }

  public getWindowState(): WindowState | null {
    if (!this.mainWindow) return null;

    const bounds = this.mainWindow.getBounds();
    return {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: this.mainWindow.isMaximized(),
      isFullScreen: this.mainWindow.isFullScreen()
    };
  }

  public async saveState(): Promise<void> {
    const state = this.getWindowState();
    if (state) {
      log.debug('Saving window state:', state);
    }
  }

  // Message service accessors
  public getUnreadMessageCount(): number {
    return this.messageCounter ? this.messageCounter.getCurrentCount() : 0;
  }

  public isUserAuthenticated(): boolean {
    return this.authDetector ? this.authDetector.isUserAuthenticated() : false;
  }

  public async forceMessageCountCheck(): Promise<MessageCount | null> {
    if (this.messageCounter && this.authDetector?.isUserAuthenticated()) {
      return await this.messageCounter.forceCheck();
    }
    return null;
  }

  public toggleMessagePolling(enabled: boolean): void {
    if (!this.messageCounter) return;

    if (enabled && this.authDetector?.isUserAuthenticated()) {
      this.messageCounter.start();
    } else {
      this.messageCounter.stop();
    }
  }
}