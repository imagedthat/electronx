import { autoUpdater } from 'electron-updater';
import { app, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';
import semver from 'semver';

import { UpdateInfo } from '../../shared/types/ipc';
import { UPDATE_CONFIG, APP_CONFIG } from '../../shared/constants/config';
import { isDevelopment } from '../../shared/utils/platform';

export class AutoUpdater {
  private isInitialized = false;
  private isChecking = false;
  private isDownloading = false;
  private updateInfo: UpdateInfo | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private downloadProgress = 0;

  constructor() {
    this.setupAutoUpdater();
  }

  private setupAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.logger = log;
    autoUpdater.autoDownload = UPDATE_CONFIG.AUTO_DOWNLOAD;
    autoUpdater.autoInstallOnAppQuit = UPDATE_CONFIG.AUTO_INSTALL_ON_APP_QUIT;
    autoUpdater.allowPrerelease = UPDATE_CONFIG.ALLOW_PRERELEASE;
    autoUpdater.allowDowngrade = UPDATE_CONFIG.ALLOW_DOWNGRADE;

    // Set update server URL
    if (!isDevelopment()) {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'electronx',
        repo: 'electronx',
        private: false
      });
    }

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      this.isChecking = true;
      log.info('Checking for updates...');
      this.notifyMainWindow('updater:checking');
    });

    autoUpdater.on('update-available', (info) => {
      this.isChecking = false;
      this.updateInfo = this.parseUpdateInfo(info);
      log.info('Update available:', this.updateInfo);
      this.notifyMainWindow('updater:available', this.updateInfo);
      this.handleUpdateAvailable();
    });

    autoUpdater.on('update-not-available', (info) => {
      this.isChecking = false;
      log.info('Update not available:', info.version);
      this.notifyMainWindow('updater:not-available', { version: info.version });
    });

    autoUpdater.on('error', (error) => {
      this.isChecking = false;
      this.isDownloading = false;
      log.error('Auto-updater error:', error);
      this.notifyMainWindow('updater:error', { error: error.message });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.downloadProgress = Math.round(progress.percent);
      log.debug(`Download progress: ${this.downloadProgress}%`);
      this.notifyMainWindow('updater:download-progress', {
        percent: this.downloadProgress,
        bytesPerSecond: progress.bytesPerSecond,
        total: progress.total,
        transferred: progress.transferred
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.isDownloading = false;
      this.downloadProgress = 100;
      log.info('Update downloaded:', info.version);
      this.notifyMainWindow('updater:downloaded', this.parseUpdateInfo(info));
      this.handleUpdateDownloaded();
    });
  }

  private parseUpdateInfo(info: any): UpdateInfo {
    return {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes || '',
      downloadUrl: info.downloadUrl
    };
  }

  private async handleUpdateAvailable(): Promise<void> {
    try {
      if (!UPDATE_CONFIG.AUTO_DOWNLOAD) {
        // Ask user if they want to download the update
        const mainWindow = this.getMainWindow();
        if (mainWindow) {
          const response = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            buttons: ['Download Now', 'Later'],
            defaultId: 0,
            title: 'Update Available',
            message: `ElectronX ${this.updateInfo?.version} is available`,
            detail: 'Would you like to download it now?'
          });

          if (response.response === 0) {
            await this.downloadUpdate();
          }
        }
      } else {
        // Auto-download is enabled
        await this.downloadUpdate();
      }
    } catch (error) {
      log.error('Failed to handle update available:', error);
    }
  }

  private async handleUpdateDownloaded(): Promise<void> {
    try {
      const mainWindow = this.getMainWindow();
      if (!mainWindow) return;

      const response = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        title: 'Update Ready',
        message: `ElectronX ${this.updateInfo?.version} has been downloaded`,
        detail: 'The application will restart to apply the update.'
      });

      if (response.response === 0) {
        // Restart and install update
        setImmediate(() => {
          app.removeAllListeners('window-all-closed');
          autoUpdater.quitAndInstall(false, true);
        });
      }
    } catch (error) {
      log.error('Failed to handle update downloaded:', error);
    }
  }

  private getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows();
    return windows.find(win => !win.isDestroyed()) || null;
  }

  private notifyMainWindow(channel: string, data?: any): void {
    const mainWindow = this.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('broadcast', channel, data);
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (isDevelopment()) {
        log.info('Auto-updater disabled in development mode');
        return;
      }

      // Start periodic update checks
      this.startPeriodicChecks();

      // Check for updates on startup (after a delay)
      setTimeout(() => {
        this.checkForUpdates();
      }, 30000); // Wait 30 seconds after startup

      this.isInitialized = true;
      log.info('Auto-updater initialized');
    } catch (error) {
      log.error('Failed to initialize auto-updater:', error);
      throw error;
    }
  }

  private startPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      if (!this.isChecking && !this.isDownloading) {
        this.checkForUpdates();
      }
    }, UPDATE_CONFIG.CHECK_INTERVAL);

    log.debug('Periodic update checks started');
  }

  public async checkForUpdates(): Promise<void> {
    try {
      if (isDevelopment()) {
        log.debug('Skipping update check in development mode');
        return;
      }

      if (this.isChecking || this.isDownloading) {
        log.debug('Update check already in progress');
        return;
      }

      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('Failed to check for updates:', error);
      throw error;
    }
  }

  public async downloadUpdate(): Promise<void> {
    try {
      if (isDevelopment()) {
        log.debug('Skipping update download in development mode');
        return;
      }

      if (this.isDownloading) {
        log.debug('Update download already in progress');
        return;
      }

      this.isDownloading = true;
      this.downloadProgress = 0;
      
      await autoUpdater.downloadUpdate();
      log.info('Update download started');
    } catch (error) {
      this.isDownloading = false;
      log.error('Failed to download update:', error);
      throw error;
    }
  }

  public async installUpdate(): Promise<void> {
    try {
      if (isDevelopment()) {
        log.debug('Skipping update installation in development mode');
        return;
      }

      log.info('Installing update...');
      
      // Close all windows and quit
      app.removeAllListeners('window-all-closed');
      
      // Install and restart
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      log.error('Failed to install update:', error);
      throw error;
    }
  }

  public getStatus(): any {
    return {
      checking: this.isChecking,
      downloading: this.isDownloading,
      downloadProgress: this.downloadProgress,
      available: this.updateInfo !== null,
      updateInfo: this.updateInfo,
      currentVersion: APP_CONFIG.VERSION
    };
  }

  public getCurrentVersion(): string {
    return APP_CONFIG.VERSION;
  }

  public getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }

  public isUpdateAvailable(): boolean {
    return this.updateInfo !== null;
  }

  public isUpdateDownloaded(): boolean {
    return this.downloadProgress === 100;
  }

  public getDownloadProgress(): number {
    return this.downloadProgress;
  }

  public async checkUpdateSemver(targetVersion: string): Promise<boolean> {
    try {
      const currentVersion = this.getCurrentVersion();
      return semver.gt(targetVersion, currentVersion);
    } catch (error) {
      log.error('Failed to check version with semver:', error);
      return false;
    }
  }

  public setAutoDownload(enabled: boolean): void {
    autoUpdater.autoDownload = enabled;
    log.info('Auto-download setting changed:', enabled);
  }

  public setAutoInstallOnQuit(enabled: boolean): void {
    autoUpdater.autoInstallOnAppQuit = enabled;
    log.info('Auto-install on quit setting changed:', enabled);
  }

  public setAllowPrerelease(enabled: boolean): void {
    autoUpdater.allowPrerelease = enabled;
    log.info('Allow prerelease setting changed:', enabled);
  }

  public stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      log.debug('Periodic update checks stopped');
    }
  }

  public cleanup(): void {
    try {
      this.stopPeriodicChecks();
      
      // Remove all listeners
      autoUpdater.removeAllListeners();
      
      // Reset state
      this.isInitialized = false;
      this.isChecking = false;
      this.isDownloading = false;
      this.updateInfo = null;
      this.downloadProgress = 0;
      
      log.info('Auto-updater cleaned up');
    } catch (error) {
      log.error('Failed to cleanup auto-updater:', error);
    }
  }

  // Manual update methods for testing
  public async forceCheckForUpdates(): Promise<void> {
    this.isChecking = false;
    this.isDownloading = false;
    await this.checkForUpdates();
  }

  public async simulateUpdate(version: string): Promise<void> {
    if (!isDevelopment()) {
      log.warn('Simulate update can only be used in development mode');
      return;
    }

    const mockUpdateInfo: UpdateInfo = {
      version,
      releaseDate: new Date().toISOString(),
      releaseNotes: 'Mock update for testing purposes',
      downloadUrl: 'https://example.com/mock-update'
    };

    this.updateInfo = mockUpdateInfo;
    this.notifyMainWindow('updater:available', mockUpdateInfo);
    
    log.info('Simulated update:', mockUpdateInfo);
  }

  public async simulateDownloadProgress(): Promise<void> {
    if (!isDevelopment()) {
      log.warn('Simulate download can only be used in development mode');
      return;
    }

    this.isDownloading = true;
    
    for (let i = 0; i <= 100; i += 10) {
      this.downloadProgress = i;
      this.notifyMainWindow('updater:download-progress', {
        percent: i,
        bytesPerSecond: 1024 * 1024,
        total: 10 * 1024 * 1024,
        transferred: (i / 100) * 10 * 1024 * 1024
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    this.isDownloading = false;
    this.notifyMainWindow('updater:downloaded', this.updateInfo);
    
    log.info('Simulated download completed');
  }
}