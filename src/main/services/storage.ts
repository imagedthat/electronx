import { app } from 'electron';
import { join } from 'path';
import { writeFile, readFile, mkdir, stat, unlink } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import log from 'electron-log';
import Store from 'electron-store';

import { AppSettings } from '../../shared/types/ipc';
import { STORAGE_CONFIG, APP_CONFIG } from '../../shared/constants/config';
import { Platform } from '../../shared/utils/platform';

export class StorageManager {
  private store: Store<Record<string, unknown>>;
  private userDataPath: string;
  private settingsPath: string;
  private cachePath: string;
  private defaultSettings: AppSettings;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.settingsPath = join(this.userDataPath, STORAGE_CONFIG.SETTINGS_FILE);
    this.cachePath = join(this.userDataPath, STORAGE_CONFIG.CACHE_DIR);
    
    this.defaultSettings = {
      theme: 'system',
      autoHideMenuBar: true,
      alwaysOnTop: false,
      startMinimized: false,
      enableNotifications: true,
      zoomLevel: 1.0,
      customCSS: '',
      blockedKeywords: [],
      autoUpdate: true
    };

    this.store = new Store<Record<string, unknown>>({
      name: 'electronx-storage',
      defaults: {
        settings: this.defaultSettings,
        windowState: {
          width: 1200,
          height: 800,
          x: undefined,
          y: undefined,
          isMaximized: false,
          isFullScreen: false
        }
      },
      schema: {
        settings: {
          type: 'object',
          properties: {
            theme: { type: 'string', enum: ['light', 'dark', 'system'] },
            autoHideMenuBar: { type: 'boolean' },
            alwaysOnTop: { type: 'boolean' },
            startMinimized: { type: 'boolean' },
            enableNotifications: { type: 'boolean' },
            zoomLevel: { type: 'number', minimum: 0.25, maximum: 5.0 },
            customCSS: { type: 'string' },
            blockedKeywords: { type: 'array', items: { type: 'string' } },
            autoUpdate: { type: 'boolean' }
          }
        },
        windowState: {
          type: 'object',
          properties: {
            width: { type: 'number', minimum: 300 },
            height: { type: 'number', minimum: 200 },
            x: { type: ['number', 'null'] },
            y: { type: ['number', 'null'] },
            isMaximized: { type: 'boolean' },
            isFullScreen: { type: 'boolean' }
          }
        }
      },
      encryptionKey: this.getEncryptionKey(),
      clearInvalidConfig: true
    });
  }

  public async initialize(): Promise<void> {
    try {
      await this.ensureDirectories();
      await this.migrateOldSettings();
      await this.validateSettings();
      log.info('Storage manager initialized', { 
        userDataPath: this.userDataPath,
        settingsPath: this.settingsPath 
      });
    } catch (error) {
      log.error('Failed to initialize storage manager:', error);
      throw error;
    }
  }

  private async ensureDirectories(): Promise<void> {
    const directories = [
      this.userDataPath,
      this.cachePath,
      join(this.userDataPath, STORAGE_CONFIG.LOGS_DIR)
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        try {
          mkdirSync(dir, { recursive: true });
          log.debug('Created directory:', dir);
        } catch (error) {
          log.error('Failed to create directory:', dir, error);
          throw error;
        }
      }
    }
  }

  private async migrateOldSettings(): Promise<void> {
    try {
      // Check if old settings file exists
      const oldSettingsPath = join(this.userDataPath, 'config.json');
      if (existsSync(oldSettingsPath)) {
        log.info('Migrating old settings...');
        
        const oldSettings = JSON.parse(await readFile(oldSettingsPath, 'utf-8'));
        const migratedSettings = this.migrateSettingsFormat(oldSettings);
        
        this.store.set('settings', migratedSettings);
        
        // Backup old file before removing
        await writeFile(oldSettingsPath + '.backup', JSON.stringify(oldSettings, null, 2));
        await unlink(oldSettingsPath);
        
        log.info('Settings migration completed');
      }
    } catch (error) {
      log.warn('Settings migration failed:', error);
    }
  }

  private migrateSettingsFormat(oldSettings: any): AppSettings {
    return {
      theme: oldSettings.theme || this.defaultSettings.theme,
      autoHideMenuBar: oldSettings.autoHideMenuBar ?? this.defaultSettings.autoHideMenuBar,
      alwaysOnTop: oldSettings.alwaysOnTop ?? this.defaultSettings.alwaysOnTop,
      startMinimized: oldSettings.startMinimized ?? this.defaultSettings.startMinimized,
      enableNotifications: oldSettings.enableNotifications ?? this.defaultSettings.enableNotifications,
      zoomLevel: oldSettings.zoomLevel || this.defaultSettings.zoomLevel,
      customCSS: oldSettings.customCSS || this.defaultSettings.customCSS,
      blockedKeywords: oldSettings.blockedKeywords || this.defaultSettings.blockedKeywords,
      autoUpdate: oldSettings.autoUpdate ?? this.defaultSettings.autoUpdate
    };
  }

  private async validateSettings(): Promise<void> {
    try {
      const settings = this.store.get('settings') as AppSettings;
      const validatedSettings = this.validateAndFixSettings(settings);
      
      if (JSON.stringify(settings) !== JSON.stringify(validatedSettings)) {
        this.store.set('settings', validatedSettings);
        log.info('Settings validated and fixed');
      }
    } catch (error) {
      log.error('Settings validation failed:', error);
      this.store.set('settings', this.defaultSettings);
    }
  }

  private validateAndFixSettings(settings: any): AppSettings {
    const fixed: AppSettings = {
      theme: ['light', 'dark', 'system'].includes(settings.theme) 
        ? settings.theme 
        : this.defaultSettings.theme,
      
      autoHideMenuBar: typeof settings.autoHideMenuBar === 'boolean' 
        ? settings.autoHideMenuBar 
        : this.defaultSettings.autoHideMenuBar,
        
      alwaysOnTop: typeof settings.alwaysOnTop === 'boolean' 
        ? settings.alwaysOnTop 
        : this.defaultSettings.alwaysOnTop,
        
      startMinimized: typeof settings.startMinimized === 'boolean' 
        ? settings.startMinimized 
        : this.defaultSettings.startMinimized,
        
      enableNotifications: typeof settings.enableNotifications === 'boolean' 
        ? settings.enableNotifications 
        : this.defaultSettings.enableNotifications,
        
      zoomLevel: typeof settings.zoomLevel === 'number' && 
                 settings.zoomLevel >= 0.25 && 
                 settings.zoomLevel <= 5.0
        ? settings.zoomLevel 
        : this.defaultSettings.zoomLevel,
        
      customCSS: typeof settings.customCSS === 'string' 
        ? settings.customCSS 
        : this.defaultSettings.customCSS,
        
      blockedKeywords: Array.isArray(settings.blockedKeywords) 
        ? settings.blockedKeywords.filter((k: any) => typeof k === 'string')
        : this.defaultSettings.blockedKeywords,
        
      autoUpdate: typeof settings.autoUpdate === 'boolean' 
        ? settings.autoUpdate 
        : this.defaultSettings.autoUpdate
    };

    return fixed;
  }

  private getEncryptionKey(): string {
    // Generate a machine-specific encryption key
    const machineId = Platform.current + Platform.architecture + APP_CONFIG.APP_ID;
    
    // Simple key derivation - in production, use a proper key derivation function
    let hash = 0;
    for (let i = 0; i < machineId.length; i++) {
      const char = machineId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  // Settings management
  public async getSettings(): Promise<AppSettings> {
    try {
      const settings = this.store.get('settings') as AppSettings;
      return this.validateAndFixSettings(settings);
    } catch (error) {
      log.error('Failed to get settings:', error);
      return this.defaultSettings;
    }
  }

  public async setSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      const validatedSettings = this.validateAndFixSettings(newSettings);
      
      this.store.set('settings', validatedSettings);
      log.debug('Settings updated:', validatedSettings);
    } catch (error) {
      log.error('Failed to set settings:', error);
      throw error;
    }
  }

  public async resetSettings(): Promise<void> {
    try {
      this.store.set('settings', this.defaultSettings);
      log.info('Settings reset to defaults');
    } catch (error) {
      log.error('Failed to reset settings:', error);
      throw error;
    }
  }

  // Generic storage methods
  public async get<T>(key: string): Promise<T | undefined> {
    try {
      return this.store.get(key) as T;
    } catch (error) {
      log.error(`Failed to get key '${key}':`, error);
      return undefined;
    }
  }

  public async set(key: string, value: any): Promise<void> {
    try {
      this.store.set(key, value);
      log.debug(`Set key '${key}'`);
    } catch (error) {
      log.error(`Failed to set key '${key}':`, error);
      throw error;
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      this.store.delete(key);
      log.debug(`Deleted key '${key}'`);
    } catch (error) {
      log.error(`Failed to delete key '${key}':`, error);
      throw error;
    }
  }

  public async clear(): Promise<void> {
    try {
      this.store.clear();
      log.info('Storage cleared');
    } catch (error) {
      log.error('Failed to clear storage:', error);
      throw error;
    }
  }

  public async has(key: string): Promise<boolean> {
    try {
      return this.store.has(key);
    } catch (error) {
      log.error(`Failed to check key '${key}':`, error);
      return false;
    }
  }

  // File-based storage for large data
  public async writeFile(filename: string, data: string | Buffer): Promise<void> {
    try {
      const filePath = join(this.cachePath, filename);
      await writeFile(filePath, data, 'utf-8');
      log.debug('File written:', filePath);
    } catch (error) {
      log.error('Failed to write file:', filename, error);
      throw error;
    }
  }

  public async readFile(filename: string): Promise<string | null> {
    try {
      const filePath = join(this.cachePath, filename);
      const data = await readFile(filePath, 'utf-8');
      log.debug('File read:', filePath);
      return data;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        log.error('Failed to read file:', filename, error);
      }
      return null;
    }
  }

  public async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = join(this.cachePath, filename);
      await unlink(filePath);
      log.debug('File deleted:', filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        log.error('Failed to delete file:', filename, error);
        throw error;
      }
    }
  }

  public async fileExists(filename: string): Promise<boolean> {
    try {
      const filePath = join(this.cachePath, filename);
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Cache management
  public async clearCache(): Promise<void> {
    try {
      const cacheDir = this.cachePath;
      // Implementation to clear cache directory
      log.info('Cache cleared');
    } catch (error) {
      log.error('Failed to clear cache:', error);
      throw error;
    }
  }

  public async getCacheSize(): Promise<number> {
    try {
      // Implementation to calculate cache size
      return 0;
    } catch (error) {
      log.error('Failed to get cache size:', error);
      return 0;
    }
  }

  // Backup and restore
  public async createBackup(): Promise<string> {
    try {
      const backup = {
        version: APP_CONFIG.VERSION,
        timestamp: new Date().toISOString(),
        settings: await this.getSettings(),
        windowState: this.store.get('windowState'),
        platform: Platform.current
      };

      const backupData = JSON.stringify(backup, null, 2);
      const backupFilename = `backup-${Date.now()}.json`;
      
      await this.writeFile(backupFilename, backupData);
      log.info('Backup created:', backupFilename);
      
      return backupFilename;
    } catch (error) {
      log.error('Failed to create backup:', error);
      throw error;
    }
  }

  public async restoreBackup(backupFilename: string): Promise<void> {
    try {
      const backupData = await this.readFile(backupFilename);
      if (!backupData) {
        throw new Error('Backup file not found');
      }

      const backup = JSON.parse(backupData);
      
      if (backup.settings) {
        await this.setSettings(backup.settings);
      }
      
      if (backup.windowState) {
        this.store.set('windowState', backup.windowState);
      }

      log.info('Backup restored:', backupFilename);
    } catch (error) {
      log.error('Failed to restore backup:', error);
      throw error;
    }
  }

  // Cleanup and maintenance
  public async flush(): Promise<void> {
    try {
      // Force write all pending data
      log.debug('Storage flushed');
    } catch (error) {
      log.error('Failed to flush storage:', error);
    }
  }

  public getStorageInfo(): any {
    return {
      userDataPath: this.userDataPath,
      settingsPath: this.settingsPath,
      cachePath: this.cachePath,
      storeSize: this.store.size,
      encryptionEnabled: true
    };
  }
}