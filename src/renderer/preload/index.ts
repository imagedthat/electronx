import { contextBridge, ipcRenderer, shell } from 'electron';
import { IPCChannel, IPCMessage, IPCResponse, ElectronAPI, NotificationData, SystemInfo } from '../../shared/types/ipc';
import { Platform } from '../../shared/utils/platform';

class SecureIPCBridge {
  private listeners = new Map<string, Set<Function>>();
  private requestId = 0;

  constructor() {
    this.setupIPC();
  }

  private setupIPC(): void {
    // Handle IPC responses
    ipcRenderer.on('ipc-response', (event, response: IPCResponse) => {
      const listeners = this.listeners.get(response.requestId || '');
      if (listeners) {
        listeners.forEach(callback => callback(response));
        this.listeners.delete(response.requestId || '');
      }
    });

    // Handle broadcast messages
    ipcRenderer.on('broadcast', (event, channel: IPCChannel, data: any) => {
      const listeners = this.listeners.get(channel);
      if (listeners) {
        listeners.forEach(callback => callback(data));
      }
    });
  }

  private generateRequestId(): string {
    return `req_${++this.requestId}_${Date.now()}`;
  }

  private validateChannel(channel: IPCChannel): boolean {
    const allowedChannels: IPCChannel[] = [
      'app:get-version',
      'app:quit',
      'app:minimize',
      'app:maximize',
      'app:unmaximize',
      'app:close',
      'app:toggle-fullscreen',
      'app:set-always-on-top',
      'app:get-system-info',
      'window:get-state',
      'window:set-state',
      'window:reload',
      'window:dev-tools',
      'settings:get',
      'settings:set',
      'settings:reset',
      'theme:get',
      'theme:set',
      'theme:toggle',
      'notifications:show',
      'notifications:permission',
      'updater:check',
      'updater:download',
      'updater:install',
      'updater:status',
      'storage:get',
      'storage:set',
      'storage:delete',
      'storage:clear',
      'menu:show-context',
      'shortcuts:register',
      'shortcuts:unregister',
      'url:open-external',
      'messages:get-count',
      'messages:force-check',
      'messages:toggle-polling'
    ];

    return allowedChannels.includes(channel);
  }

  public async invoke(channel: IPCChannel, data?: any): Promise<IPCResponse> {
    if (!this.validateChannel(channel)) {
      throw new Error(`Invalid IPC channel: ${channel}`);
    }

    const requestId = this.generateRequestId();
    const message: IPCMessage = { channel, data, requestId };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.listeners.delete(requestId);
        reject(new Error(`IPC timeout for channel: ${channel}`));
      }, 30000); // 30 second timeout

      if (!this.listeners.has(requestId)) {
        this.listeners.set(requestId, new Set());
      }

      this.listeners.get(requestId)!.add((response: IPCResponse) => {
        clearTimeout(timeout);
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'IPC request failed'));
        }
      });

      ipcRenderer.send('ipc-request', message);
    });
  }

  public send(channel: IPCChannel, data?: any): void {
    if (!this.validateChannel(channel)) {
      console.error(`Invalid IPC channel: ${channel}`);
      return;
    }

    const message: IPCMessage = { channel, data };
    ipcRenderer.send('ipc-message', message);
  }

  public on(channel: IPCChannel, callback: (data: any) => void): () => void {
    if (!this.validateChannel(channel)) {
      console.error(`Invalid IPC channel: ${channel}`);
      return () => {};
    }

    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }

    this.listeners.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(channel);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(channel);
        }
      }
    };
  }

  public off(channel: IPCChannel, callback: (data: any) => void): void {
    const listeners = this.listeners.get(channel);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(channel);
      }
    }
  }
}

class ElectronAPIImpl implements ElectronAPI {
  private ipcBridge: SecureIPCBridge;

  constructor(ipcBridge: SecureIPCBridge) {
    this.ipcBridge = ipcBridge;
  }

  get platform(): string {
    return process.platform;
  }

  get versions(): NodeJS.ProcessVersions {
    return process.versions;
  }

  public async invoke(channel: IPCChannel, data?: any): Promise<IPCResponse> {
    return this.ipcBridge.invoke(channel, data);
  }

  public send(channel: IPCChannel, data?: any): void {
    this.ipcBridge.send(channel, data);
  }

  public on(channel: IPCChannel, callback: (data: any) => void): () => void {
    return this.ipcBridge.on(channel, callback);
  }

  public off(channel: IPCChannel, callback: (data: any) => void): void {
    this.ipcBridge.off(channel, callback);
  }

  public async showNotification(data: NotificationData): Promise<void> {
    try {
      await this.invoke('notifications:show', data);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  public async openExternal(url: string): Promise<void> {
    try {
      // Validate URL before opening
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('Invalid URL protocol');
      }

      await shell.openExternal(url);
    } catch (error) {
      console.error('Failed to open external URL:', error);
    }
  }

  public getSystemInfo(): SystemInfo {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.versions.electron,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node
    };
  }
}

// Security utilities
const SecurityUtils = {
  sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },

  validateURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },

  escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  },

  isAllowedOrigin(origin: string): boolean {
    const allowed = ['https://x.com', 'https://twitter.com', 'https://twimg.com'];
    return allowed.some(allowedOrigin => origin.startsWith(allowedOrigin));
  }
};

// Performance utilities
const PerformanceUtils = {
  debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
  },

  throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
    let inThrottle: boolean;
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  },

  measurePerformance(name: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.debug(`Performance [${name}]: ${end - start}ms`);
  },

  async measureAsyncPerformance(name: string, fn: () => Promise<void>): Promise<void> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    console.debug(`Async Performance [${name}]: ${end - start}ms`);
  }
};

// Theme utilities
const ThemeUtils = {
  getSystemTheme(): 'light' | 'dark' {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  },

  watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
    if (!window.matchMedia) return () => {};

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      callback(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  },

  applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }
};

// Storage utilities with encryption
const StorageUtils = {
  async setItem(key: string, value: any): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await electronAPI.invoke('storage:set', { key, value: serialized });
    } catch (error) {
      console.error('Failed to store item:', error);
    }
  },

  async getItem<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const response = await electronAPI.invoke('storage:get', { key });
      if (response.success && response.data) {
        return JSON.parse(response.data);
      }
      return defaultValue;
    } catch (error) {
      console.error('Failed to retrieve item:', error);
      return defaultValue;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await electronAPI.invoke('storage:delete', { key });
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await electronAPI.invoke('storage:clear');
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
};

// Create IPC bridge and API
const ipcBridge = new SecureIPCBridge();
const electronAPI = new ElectronAPIImpl(ipcBridge);

// Expose secure API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('platform', Platform);
contextBridge.exposeInMainWorld('securityUtils', SecurityUtils);
contextBridge.exposeInMainWorld('performanceUtils', PerformanceUtils);
contextBridge.exposeInMainWorld('themeUtils', ThemeUtils);
contextBridge.exposeInMainWorld('storageUtils', StorageUtils);

// Expose version information
contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
  platform: process.platform,
  arch: process.arch
});

// Security logging
console.log('ElectronX preload script loaded securely');
console.log('Available APIs:', Object.keys({
  electronAPI,
  platform: Platform,
  securityUtils: SecurityUtils,
  performanceUtils: PerformanceUtils,
  themeUtils: ThemeUtils,
  storageUtils: StorageUtils,
  versions: process.versions
}));

// Export types for TypeScript support
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    platform: typeof Platform;
    securityUtils: typeof SecurityUtils;
    performanceUtils: typeof PerformanceUtils;
    themeUtils: typeof ThemeUtils;
    storageUtils: typeof StorageUtils;
    versions: {
      node: string;
      chrome: string;
      electron: string;
      platform: string;
      arch: string;
    };
  }
}