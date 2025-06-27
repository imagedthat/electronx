import { ipcMain, app, nativeTheme, globalShortcut, shell } from 'electron';
import log from 'electron-log';

import { WindowManager } from '../window-manager';
import { StorageManager } from '../services/storage';
import { NotificationManager } from '../services/notifications';
import { IPCMessage, IPCResponse, IPCChannel, AppSettings, NotificationData } from '../../shared/types/ipc';
import { APP_CONFIG, FEATURE_FLAGS } from '../../shared/constants/config';
import { Platform, getAppInfo } from '../../shared/utils/platform';
import { validateSettings, isValidUrl } from '../../shared/utils/validation';

export class IPCHandler {
  private windowManager: WindowManager;
  private storageManager: StorageManager;
  private notificationManager: NotificationManager;

  constructor(windowManager: WindowManager, storageManager: StorageManager, notificationManager: NotificationManager) {
    this.windowManager = windowManager;
    this.storageManager = storageManager;
    this.notificationManager = notificationManager;
  }

  public initialize(): void {
    this.setupRequestHandlers();
    this.setupMessageHandlers();
    log.info('IPC handlers initialized');
  }

  private setupRequestHandlers(): void {
    ipcMain.handle('ipc-request', async (event, message: IPCMessage) => {
      try {
        return await this.handleRequest(message);
      } catch (error) {
        log.error('IPC request error:', error);
        const errorResponse: IPCResponse = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: message.requestId
        };
        return errorResponse;
      }
    });
  }

  private setupMessageHandlers(): void {
    ipcMain.on('ipc-message', (event, message: IPCMessage) => {
      try {
        this.handleMessage(message);
      } catch (error) {
        log.error('IPC message error:', error);
      }
    });
  }

  private async handleRequest(message: IPCMessage): Promise<IPCResponse> {
    const { channel, data, requestId } = message;
    
    log.debug('Handling IPC request:', { channel, requestId });

    let result: any;

    switch (channel) {
      case 'app:get-version':
        result = APP_CONFIG.VERSION;
        break;

      case 'app:get-system-info':
        result = {
          ...getAppInfo(),
          platform: Platform.current,
          versions: Platform.versions,
          features: FEATURE_FLAGS
        };
        break;

      case 'window:get-state':
        result = this.windowManager.getWindowState();
        break;

      case 'window:set-state':
        if (data && typeof data === 'object') {
          // Implementation would set window state
          result = { success: true };
        } else {
          throw new Error('Invalid window state data');
        }
        break;

      case 'settings:get':
        result = await this.storageManager.getSettings();
        break;

      case 'settings:set':
        if (!validateSettings(data)) {
          throw new Error('Invalid settings data');
        }
        await this.storageManager.setSettings(data);
        result = { success: true };
        break;

      case 'settings:reset':
        await this.storageManager.resetSettings();
        result = { success: true };
        break;

      case 'theme:get':
        result = {
          current: nativeTheme.themeSource,
          shouldUseDark: nativeTheme.shouldUseDarkColors,
          system: nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
        };
        break;

      case 'theme:set':
        if (data && ['light', 'dark', 'system'].includes(data.theme)) {
          nativeTheme.themeSource = data.theme;
          this.windowManager.updateTheme(data.theme === 'system' 
            ? (nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
            : data.theme);
          result = { success: true };
        } else {
          throw new Error('Invalid theme value');
        }
        break;

      case 'theme:toggle':
        const currentTheme = nativeTheme.themeSource;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        nativeTheme.themeSource = newTheme;
        this.windowManager.updateTheme(newTheme);
        result = { theme: newTheme };
        break;

      case 'notifications:show':
        if (data && this.isValidNotificationData(data)) {
          await this.notificationManager.show(data);
          result = { success: true };
        } else {
          throw new Error('Invalid notification data');
        }
        break;

      case 'notifications:permission':
        result = { permission: await this.notificationManager.getPermission() };
        break;

      case 'storage:get':
        if (data && data.key) {
          result = await this.storageManager.get(data.key);
        } else {
          throw new Error('Storage key required');
        }
        break;

      case 'storage:set':
        if (data && data.key && data.value !== undefined) {
          await this.storageManager.set(data.key, data.value);
          result = { success: true };
        } else {
          throw new Error('Storage key and value required');
        }
        break;

      case 'storage:delete':
        if (data && data.key) {
          await this.storageManager.delete(data.key);
          result = { success: true };
        } else {
          throw new Error('Storage key required');
        }
        break;

      case 'storage:clear':
        await this.storageManager.clear();
        result = { success: true };
        break;

      case 'shortcuts:register':
        if (data && data.accelerator && data.callback) {
          const success = globalShortcut.register(data.accelerator, data.callback);
          result = { success, registered: success };
        } else {
          throw new Error('Invalid shortcut data');
        }
        break;

      case 'shortcuts:unregister':
        if (data && data.accelerator) {
          globalShortcut.unregister(data.accelerator);
          result = { success: true };
        } else {
          throw new Error('Accelerator required');
        }
        break;

      case 'url:open-external':
        if (data && data.url && isValidUrl(data.url)) {
          await shell.openExternal(data.url);
          result = { success: true };
        } else {
          throw new Error('Valid URL required');
        }
        break;

      case 'updater:check':
        // Auto-updater implementation would go here
        result = { available: false, version: APP_CONFIG.VERSION };
        break;

      case 'updater:status':
        result = { 
          checking: false,
          downloading: false,
          available: false,
          downloaded: false
        };
        break;

      case 'messages:get-count':
        result = {
          count: this.windowManager.getUnreadMessageCount(),
          isAuthenticated: this.windowManager.isUserAuthenticated()
        };
        break;

      case 'messages:force-check':
        result = await this.windowManager.forceMessageCountCheck();
        break;

      case 'messages:toggle-polling':
        if (data && typeof data.enabled === 'boolean') {
          this.windowManager.toggleMessagePolling(data.enabled);
          result = { success: true };
        } else {
          throw new Error('Boolean enabled value required');
        }
        break;

      default:
        throw new Error(`Unknown IPC channel: ${channel}`);
    }

    return {
      success: true,
      data: result,
      requestId
    };
  }

  private handleMessage(message: IPCMessage): void {
    const { channel, data } = message;
    
    log.debug('Handling IPC message:', { channel });

    switch (channel) {
      case 'app:quit':
        app.quit();
        break;

      case 'app:minimize':
        this.windowManager.minimize();
        break;

      case 'app:maximize':
        this.windowManager.maximize();
        break;

      case 'app:unmaximize':
        this.windowManager.maximize(); // toggles
        break;

      case 'app:close':
        this.windowManager.close();
        break;

      case 'app:toggle-fullscreen':
        this.windowManager.toggleFullscreen();
        break;

      case 'app:set-always-on-top':
        if (data && typeof data.alwaysOnTop === 'boolean') {
          const mainWindow = this.windowManager.getMainWindow();
          if (mainWindow) {
            mainWindow.setAlwaysOnTop(data.alwaysOnTop);
          }
        }
        break;

      case 'window:reload':
        this.windowManager.reload();
        break;

      case 'window:dev-tools':
        if (FEATURE_FLAGS.ENABLE_DEV_TOOLS) {
          this.windowManager.openDevTools();
        }
        break;

      default:
        log.warn('Unknown IPC message channel:', channel);
    }
  }

  private isValidNotificationData(data: any): data is NotificationData {
    return data && 
           typeof data === 'object' &&
           typeof data.title === 'string' &&
           typeof data.body === 'string';
  }

  public broadcast(channel: IPCChannel, data?: any): void {
    const mainWindow = this.windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('broadcast', channel, data);
    }
  }

  public destroy(): void {
    ipcMain.removeAllListeners('ipc-request');
    ipcMain.removeAllListeners('ipc-message');
    log.info('IPC handlers destroyed');
  }
}