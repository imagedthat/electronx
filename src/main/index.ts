import { app, BrowserWindow, session, protocol, nativeTheme } from 'electron';
import { join } from 'path';
import log from 'electron-log';

import { WindowManager } from './window-manager';
import { MenuBuilder } from './menu-builder';
import { SecurityManager } from './security/permissions';
import { AutoUpdater } from './services/auto-updater';
import { NotificationManager } from './services/notifications';
import { StorageManager } from './services/storage';
import { IPCHandler } from './ipc/handlers';
import { APP_CONFIG, FEATURE_FLAGS, PERFORMANCE_CONFIG } from '../shared/constants/config';
import { Platform, isDevelopment } from '../shared/utils/platform';

class ElectronXApp {
  private windowManager: WindowManager;
  private menuBuilder: MenuBuilder;
  private securityManager: SecurityManager;
  private autoUpdater: AutoUpdater;
  private notificationManager: NotificationManager;
  private storageManager: StorageManager;
  private ipcHandler: IPCHandler;
  private isQuiting = false;

  constructor() {
    this.setupLogging();
    this.windowManager = new WindowManager();
    this.menuBuilder = new MenuBuilder(this.windowManager);
    this.securityManager = new SecurityManager();
    this.autoUpdater = new AutoUpdater();
    // NotificationManager will be initialized after app is ready
    this.notificationManager = new NotificationManager(false); // Don't auto-initialize
    this.storageManager = new StorageManager();
    // Pass the notification manager instance to IPCHandler instead of creating a new one
    this.ipcHandler = new IPCHandler(this.windowManager, this.storageManager, this.notificationManager);
  }

  private setupLogging(): void {
    log.transports.file.level = isDevelopment() ? 'debug' : 'info';
    log.transports.console.level = isDevelopment() ? 'debug' : 'warn';
    
    log.info('ElectronX starting...', {
      version: APP_CONFIG.VERSION,
      platform: Platform.current,
      isDev: isDevelopment(),
      versions: Platform.versions
    });

    process.on('uncaughtException', (error) => {
      log.error('Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  private async setupSecurity(): Promise<void> {
    // Set up Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': this.securityManager.getCSPHeader()
        }
      });
    });

    // Block navigation to external sites
    app.on('web-contents-created', (_, contents) => {
      contents.on('will-navigate', (event, navigationUrl) => {
        if (!this.securityManager.isAllowedNavigation(navigationUrl)) {
          event.preventDefault();
          log.warn('Blocked navigation to:', navigationUrl);
        }
      });

      contents.setWindowOpenHandler(({ url }) => {
        if (!this.securityManager.isAllowedNavigation(url)) {
          log.warn('Blocked window.open to:', url);
          return { action: 'deny' };
        }
        return { action: 'allow' };
      });
    });

    // Handle certificate errors
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      if (isDevelopment()) {
        event.preventDefault();
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  private async setupProtocols(): Promise<void> {
    // Register custom protocol for local resources
    protocol.registerFileProtocol('electronx', (request, callback) => {
      const url = request.url.substr(10);
      callback(join(__dirname, '..', url));
    });

    // Handle x.com protocol links
    if (!app.isDefaultProtocolClient('x')) {
      app.setAsDefaultProtocolClient('x');
    }

    app.on('open-url', (event, url) => {
      event.preventDefault();
      if (url.startsWith('x://') || url.startsWith('twitter://')) {
        const convertedUrl = this.convertProtocolUrl(url);
        this.windowManager.loadUrl(convertedUrl);
      }
    });
  }

  private convertProtocolUrl(protocolUrl: string): string {
    // Convert x:// or twitter:// URLs to https://x.com URLs
    const url = protocolUrl.replace(/^(x|twitter):\/\//, 'https://x.com/');
    return url;
  }

  private setupAppEvents(): void {
    app.on('ready', async () => {
      await this.onReady();
    });

    app.on('activate', () => {
      // On macOS, re-create window when dock icon is clicked and no windows are open
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.createMainWindow();
      } else {
        this.windowManager.focusMainWindow();
      }
    });

    app.on('window-all-closed', () => {
      // Always quit when all windows are closed for this single-window app
      app.quit();
    });

    app.on('will-quit', async (event) => {
      event.preventDefault();
      await this.onWillQuit();
      app.exit(0);
    });

    app.on('second-instance', (event, commandLine, workingDirectory) => {
      this.windowManager.focusMainWindow();
      
      // Handle protocol URLs from second instance
      const url = commandLine.find(arg => arg.startsWith('x://') || arg.startsWith('twitter://'));
      if (url) {
        const convertedUrl = this.convertProtocolUrl(url);
        this.windowManager.loadUrl(convertedUrl);
      }
    });

    // Handle system theme changes
    nativeTheme.on('updated', async () => {
      const settings = await this.storageManager.getSettings();
      if (settings.theme === 'system') {
        this.windowManager.updateTheme(nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
      }
    });
  }

  private async onReady(): Promise<void> {
    log.info('App is ready, initializing...');

    // Ensure single instance
    if (!app.requestSingleInstanceLock()) {
      log.info('Another instance is already running, quitting...');
      app.quit();
      return;
    }

    try {
      // Initialize security manager first
      await this.securityManager.initialize();
      await this.setupSecurity();
      await this.setupProtocols();
      
      // Initialize services
      await this.storageManager.initialize();
      await this.notificationManager.initialize();
      
      if (!isDevelopment() && FEATURE_FLAGS.ENABLE_AUTO_UPDATER) {
        await this.autoUpdater.initialize();
      }

      // Create main window
      await this.windowManager.createMainWindow();
      
      // Set up menu
      await this.menuBuilder.buildMenu();
      
      // Initialize IPC handlers
      this.ipcHandler.initialize();

      log.info('ElectronX initialized successfully');
    } catch (error) {
      log.error('Failed to initialize ElectronX:', error);
      app.quit();
    }
  }

  private async onWillQuit(): Promise<void> {
    log.info('App is quitting, cleaning up...');
    
    this.isQuiting = true;
    
    try {
      await this.windowManager.saveState();
      await this.storageManager.flush();
      
      if (FEATURE_FLAGS.ENABLE_AUTO_UPDATER) {
        this.autoUpdater.cleanup();
      }
      
      log.info('Cleanup completed');
    } catch (error) {
      log.error('Error during cleanup:', error);
    }
  }

  public start(): void {
    // Handle app events
    this.setupAppEvents();

    // Handle Squirrel events on Windows
    if (Platform.isWindows) {
      const { handleSquirrelEvent } = require('./services/squirrel-handler');
      if (handleSquirrelEvent()) {
        return;
      }
    }

    // Set app security
    app.enableSandbox();

    // Performance optimizations
    if (PERFORMANCE_CONFIG.ENABLE_HARDWARE_ACCELERATION) {
      app.commandLine.appendSwitch('enable-hardware-acceleration');
    } else {
      app.disableHardwareAcceleration();
    }

    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
    app.commandLine.appendSwitch('ignore-gpu-blacklist');
    app.commandLine.appendSwitch('enable-gpu-rasterization');

    log.info('ElectronX app started');
  }
}

// Create and start the application
const electronXApp = new ElectronXApp();
electronXApp.start();

// Handle cleanup on process termination
process.on('SIGTERM', () => {
  log.info('Received SIGTERM, shutting down gracefully...');
  app.quit();
});

process.on('SIGINT', () => {
  log.info('Received SIGINT, shutting down gracefully...');
  app.quit();
});