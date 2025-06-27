import { Notification, nativeImage, app } from 'electron';
import { join } from 'path';
import log from 'electron-log';
import notifier from 'node-notifier';

import { NotificationData } from '../../shared/types/ipc';
import { Platform } from '../../shared/utils/platform';

export class NotificationManager {
  private isSupported: boolean;
  private permission: 'granted' | 'denied' | 'default' = 'default';
  private notificationQueue: NotificationData[] = [];
  private isProcessingQueue = false;

  constructor(autoInitialize: boolean = true) {
    // Don't call Notification.isSupported() or initialize() until app is ready
    this.isSupported = false; // Will be set properly in initialize()
    if (autoInitialize) {
      this.initialize();
    }
  }

  public async initialize(): Promise<void> {
    try {
      // Now that app is ready, check if notifications are supported
      this.isSupported = Notification.isSupported();
      
      if (!this.isSupported) {
        log.warn('Notifications are not supported on this platform');
        return;
      }

      // Request permission on startup
      await this.requestPermission();

      log.info('Notification manager initialized', { 
        supported: this.isSupported,
        permission: this.permission 
      });
    } catch (error) {
      log.error('Failed to initialize notification manager:', error);
    }
  }

  private async requestPermission(): Promise<void> {
    try {
      if (Platform.isMacOS) {
        // On macOS, we need to check if the app is authorized
        const hasPermission = await this.checkMacOSPermission();
        this.permission = hasPermission ? 'granted' : 'denied';
      } else if (Platform.isWindows) {
        // On Windows, notifications are generally allowed
        this.permission = 'granted';
      } else {
        // On Linux, use the system notification daemon
        this.permission = 'granted';
      }

      log.debug('Notification permission:', this.permission);
    } catch (error) {
      log.error('Failed to request notification permission:', error);
      this.permission = 'denied';
    }
  }

  private async checkMacOSPermission(): Promise<boolean> {
    try {
      // On macOS, check permission without showing a test notification
      // We'll assume permission is granted if the app is properly configured
      // The badge manager handles permission requests separately
      return true; // Let the badge manager handle permissions
    } catch (error) {
      log.error('Failed to check macOS notification permission:', error);
      return false;
    }
  }

  public async show(data: NotificationData): Promise<void> {
    try {
      if (!this.isSupported) {
        log.warn('Notifications not supported, skipping notification');
        return;
      }

      if (this.permission !== 'granted') {
        log.warn('Notification permission not granted, adding to queue');
        this.notificationQueue.push(data);
        return;
      }

      await this.showNotification(data);
    } catch (error) {
      log.error('Failed to show notification:', error);
      
      // Fallback to system notification
      this.showFallbackNotification(data);
    }
  }

  private async showNotification(data: NotificationData): Promise<void> {
    try {
      const icon = await this.getNotificationIcon(data.icon);
      
      const notification = new Notification({
        title: data.title,
        body: data.body,
        icon: icon,
        silent: data.silent || false,
        urgency: this.mapUrgency(data.urgency),
      });

      notification.on('click', () => {
        // Bring app to front when notification is clicked
        this.focusApp();
        log.debug('Notification clicked');
      });

      notification.on('close', () => {
        log.debug('Notification closed');
      });

      notification.on('show', () => {
        log.debug('Notification shown');
      });

      notification.on('failed', (error) => {
        log.error('Notification failed:', error);
        this.showFallbackNotification(data);
      });

      notification.show();

      log.debug('Notification displayed:', { title: data.title });
    } catch (error) {
      log.error('Failed to create Electron notification:', error);
      this.showFallbackNotification(data);
    }
  }

  private showFallbackNotification(data: NotificationData): void {
    try {
      const iconPath = this.getSystemIconPath();
      
      notifier.notify({
        title: data.title,
        message: data.body,
        icon: iconPath,
        wait: false,
        appID: 'com.electronx.app'
      }, (error: any, response: any) => {
        if (error) {
          log.error('Fallback notification failed:', error);
        } else {
          log.debug('Fallback notification shown:', response);
        }
      });

      notifier.on('click', () => {
        this.focusApp();
      });

    } catch (error) {
      log.error('All notification methods failed:', error);
    }
  }

  private async getNotificationIcon(customIcon?: string): Promise<Electron.NativeImage | undefined> {
    try {
      if (customIcon) {
        // Try to load custom icon
        return nativeImage.createFromPath(customIcon);
      }

      // Use app icon
      const iconPath = this.getAppIconPath();
      if (iconPath) {
        return nativeImage.createFromPath(iconPath);
      }

      return undefined;
    } catch (error) {
      log.error('Failed to load notification icon:', error);
      return undefined;
    }
  }

  private getAppIconPath(): string | null {
    try {
      const resourcesPath = app.getAppPath();
      
      if (Platform.isWindows) {
        return join(resourcesPath, 'assets', 'icons', 'icon.ico');
      } else if (Platform.isMacOS) {
        return join(resourcesPath, 'assets', 'icons', 'icon.icns');
      } else {
        return join(resourcesPath, 'assets', 'icons', 'icon.png');
      }
    } catch (error) {
      log.error('Failed to get app icon path:', error);
      return null;
    }
  }

  private getSystemIconPath(): string | undefined {
    try {
      const iconPath = this.getAppIconPath();
      return iconPath || undefined;
    } catch (error) {
      log.error('Failed to get system icon path:', error);
      return undefined;
    }
  }

  private mapUrgency(urgency?: 'low' | 'normal' | 'critical'): 'low' | 'normal' | 'critical' {
    switch (urgency) {
      case 'low':
        return 'low';
      case 'critical':
        return 'critical';
      default:
        return 'normal';
    }
  }

  private focusApp(): void {
    try {
      if (Platform.isMacOS) {
        app.dock.show();
      }
      
      // Focus the main window
      const windows = require('electron').BrowserWindow.getAllWindows();
      const mainWindow = windows.find((win: Electron.BrowserWindow) => !win.isDestroyed());
      
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
        mainWindow.show();
      }
    } catch (error) {
      log.error('Failed to focus app from notification:', error);
    }
  }

  public async getPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (!this.isSupported) {
      return 'denied';
    }

    // Re-check permission status
    await this.requestPermission();
    return this.permission;
  }

  public async requestPermissionExplicit(): Promise<'granted' | 'denied'> {
    try {
      if (!this.isSupported) {
        return 'denied';
      }

      // Force permission request
      await this.requestPermission();
      
      if (this.permission === 'granted' && this.notificationQueue.length > 0) {
        // Process queued notifications
        this.processNotificationQueue();
      }

      return this.permission === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      log.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        if (notification) {
          await this.showNotification(notification);
          // Small delay between notifications
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      log.error('Failed to process notification queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  public isNotificationSupported(): boolean {
    return this.isSupported;
  }

  public getPermissionStatus(): 'granted' | 'denied' | 'default' {
    return this.permission;
  }

  public clearNotificationQueue(): void {
    this.notificationQueue = [];
    log.debug('Notification queue cleared');
  }

  public getQueueLength(): number {
    return this.notificationQueue.length;
  }

  // Platform-specific notification methods
  public async showSystemTrayNotification(title: string, body: string): Promise<void> {
    try {
      const data: NotificationData = {
        title: `ElectronX - ${title}`,
        body,
        silent: true
      };

      await this.show(data);
    } catch (error) {
      log.error('Failed to show system tray notification:', error);
    }
  }

  public async showUpdateNotification(version: string): Promise<void> {
    try {
      const data: NotificationData = {
        title: 'ElectronX Update Available',
        body: `Version ${version} is ready to install. Click to restart and update.`,
        urgency: 'normal'
      };

      await this.show(data);
    } catch (error) {
      log.error('Failed to show update notification:', error);
    }
  }

  public async showConnectionNotification(status: 'connected' | 'disconnected'): Promise<void> {
    try {
      const data: NotificationData = {
        title: 'ElectronX Connection Status',
        body: status === 'connected' 
          ? 'Connected to X.com' 
          : 'Connection to X.com lost',
        urgency: status === 'connected' ? 'low' : 'normal',
        silent: true
      };

      await this.show(data);
    } catch (error) {
      log.error('Failed to show connection notification:', error);
    }
  }

  public destroy(): void {
    try {
      this.clearNotificationQueue();
      
      // Remove all notification listeners
      notifier.removeAllListeners();
      
      log.debug('Notification manager destroyed');
    } catch (error) {
      log.error('Failed to destroy notification manager:', error);
    }
  }
}