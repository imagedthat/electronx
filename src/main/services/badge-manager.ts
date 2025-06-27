import { app, BrowserWindow, nativeImage, Notification } from 'electron';
import { join } from 'path';
import log from 'electron-log';
import { Platform } from '../../shared/utils/platform';

export class BadgeManager {
  private currentCount = 0;
  private mainWindow: BrowserWindow | null = null;
  private hasNotificationPermission = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    // Request permissions immediately on startup
    this.requestNotificationPermissionsOnStartup();
  }

  public async requestNotificationPermissions(): Promise<void> {
    try {
      if (this.mainWindow) {
        log.info(`Requesting notification permissions for badge support on ${process.platform}...`);
        
        // Use the renderer process to request permissions (more reliable)
        const result = await this.mainWindow.webContents.executeJavaScript(`
          (async function() {
            try {
              console.log('Requesting notification permissions for platform:', '${process.platform}');
              
              // Check if notifications are supported
              if (!('Notification' in window)) {
                console.log('Notifications not supported on this platform');
                return { success: false, reason: 'not_supported', platform: '${process.platform}' };
              }
              
              // Check current permission
              const currentPermission = Notification.permission;
              console.log('Current notification permission:', currentPermission);
              
              if (currentPermission === 'default') {
                // Request permission
                const permission = await Notification.requestPermission();
                console.log('Permission request result:', permission);
                return { success: true, permission: permission, platform: '${process.platform}' };
              } else {
                return { success: true, permission: currentPermission, platform: '${process.platform}' };
              }
            } catch (error) {
              console.error('Permission request failed:', error);
              return { success: false, error: error.message, platform: '${process.platform}' };
            }
          })();
        `);
        
        log.info(`${result.platform} permission request result:`, result);
        this.hasNotificationPermission = result.success && result.permission === 'granted';
        
        if (this.hasNotificationPermission) {
          log.info(`✅ ${result.platform} notification permissions granted successfully`);
        } else if (result.reason === 'not_supported') {
          log.info(`ℹ️ ${result.platform} notifications not supported - badges may still work`);
          // Allow badges to work even if notifications aren't supported
          this.hasNotificationPermission = true;
        } else {
          log.warn(`❌ ${result.platform} notification permissions denied or failed`);
        }
      } else {
        log.warn('No main window available for permission request');
        this.hasNotificationPermission = false;
      }
    } catch (error) {
      log.error('Failed to request notification permissions:', error);
      this.hasNotificationPermission = false;
    }
  }

  private async requestNotificationPermissionsOnStartup(): Promise<void> {
    try {
      if (this.mainWindow) {
        log.info(`Requesting notification permissions on app startup for ${process.platform}...`);
        
        // Wait a moment for the window to be ready
        setTimeout(async () => {
          try {
            const result = await this.mainWindow!.webContents.executeJavaScript(`
              (async function() {
                try {
                  console.log('Checking notification permissions for platform:', '${process.platform}');
                  
                  // Check if notifications are supported
                  if (!('Notification' in window)) {
                    console.log('Notifications not supported on this platform');
                    return { success: false, reason: 'not_supported' };
                  }
                  
                  const currentPermission = Notification.permission;
                  console.log('Current permission status:', currentPermission);
                  
                  if (currentPermission === 'default') {
                    console.log('Requesting notification permission...');
                    const permission = await Notification.requestPermission();
                    console.log('Permission result:', permission);
                    return { success: true, permission: permission, requested: true, platform: '${process.platform}' };
                  } else {
                    console.log('Permission already set:', currentPermission);
                    return { success: true, permission: currentPermission, requested: false, platform: '${process.platform}' };
                  }
                } catch (error) {
                  console.error('Permission request failed:', error);
                  return { success: false, error: error.message, platform: '${process.platform}' };
                }
              })();
            `);
            
            log.info(`${result.platform} permission check result:`, result);
            this.hasNotificationPermission = result.success && result.permission === 'granted';
            
            if (result.requested) {
              if (this.hasNotificationPermission) {
                log.info(`✅ ${result.platform} notification permissions granted at startup`);
              } else {
                log.warn(`❌ ${result.platform} notification permissions denied at startup`);
              }
            } else if (result.success) {
              log.info(`📋 ${result.platform} notification permissions already configured:`, result.permission);
            } else {
              log.warn(`⚠️ ${result.platform} notifications not supported or failed:`, result.reason || result.error);
              // On platforms where notifications aren't supported, still allow badges to work
              this.hasNotificationPermission = true;
            }
            
          } catch (error) {
            log.error('Failed to request permissions at startup:', error);
            // Default to true for non-macOS platforms that don't require permissions
            this.hasNotificationPermission = !Platform.isMacOS;
          }
        }, 2000); // Wait 2 seconds for app to be fully loaded
        
      } else {
        log.warn('No main window available for permission request');
        this.hasNotificationPermission = false;
      }
    } catch (error) {
      log.error('Failed to check notification permissions at startup:', error);
      this.hasNotificationPermission = false;
    }
  }

  public async updateBadge(count: number): Promise<void> {
    if (count === this.currentCount) return;

    this.currentCount = count;
    log.info(`Updating badge count: ${count} on ${process.platform}, hasPermission: ${this.hasNotificationPermission}`);

    try {
      // Request permissions if not already granted and we need to show a badge
      if (!this.hasNotificationPermission && count > 0) {
        log.info(`Requesting notification permissions for badge on ${process.platform}...`);
        await this.requestNotificationPermissions();
      }

      // Use the modern cross-platform API first
      const success = app.setBadgeCount(count);
      log.info(`app.setBadgeCount result: ${success} for count: ${count} on ${process.platform}`);
      
      // Platform-specific fallbacks for better visibility
      if (Platform.isMacOS) {
        this.updateMacOSBadge(count);
      } else if (Platform.isWindows) {
        this.updateWindowsBadge(count);
      } else if (Platform.isLinux) {
        this.updateLinuxBadge(count);
      }
    } catch (error) {
      log.error('Failed to update badge:', error);
    }
  }

  private updateMacOSBadge(count: number): void {
    try {
      // Force show the dock icon first
      app.dock.show();
      
      if (count > 0) {
        const badgeText = count.toString();
        
        // Set the badge using dock API as fallback
        app.dock.setBadge(badgeText);
        log.info('macOS dock.setBadge set to:', badgeText);
        
        // Verify the badge was set
        const currentBadge = app.dock.getBadge();
        log.info('Current dock badge:', currentBadge);
      } else {
        app.dock.setBadge('');
        log.info('macOS dock badge cleared');
      }
    } catch (error) {
      log.error('Failed to update macOS badge:', error);
    }
  }

  private updateWindowsBadge(count: number): void {
    if (!this.mainWindow) return;

    try {
      if (count > 0) {
        // Create a badge overlay icon for Windows taskbar
        const badgeIcon = this.createBadgeIcon(count);
        if (badgeIcon) {
          this.mainWindow.setOverlayIcon(badgeIcon, `${count} unread messages`);
          log.info('Windows taskbar overlay badge set to:', count);
        } else {
          log.warn('Failed to create Windows badge icon');
        }
      } else {
        this.mainWindow.setOverlayIcon(null, '');
        log.info('Windows taskbar overlay badge cleared');
      }
    } catch (error) {
      log.error('Failed to update Windows badge:', error);
    }
  }

  private updateLinuxBadge(count: number): void {
    // Linux badge support is limited to Unity launcher
    try {
      if (count > 0) {
        log.info(`Linux badge support: app.setBadgeCount(${count}) - works with Unity launcher only`);
      } else {
        log.info('Linux badge cleared via app.setBadgeCount(0)');
      }
      // The main app.setBadgeCount() call above handles Linux
      // Unity launcher requires a .desktop file to be properly configured
    } catch (error) {
      log.error('Failed to update Linux badge:', error);
    }
  }

  private createBadgeIcon(count: number): Electron.NativeImage | null {
    try {
      // Create a simple SVG badge icon for Windows
      const size = 16;
      const text = count > 99 ? '99+' : count.toString();
      
      const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="8" fill="#ff4444"/>
          <text x="8" y="12" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">${text}</text>
        </svg>
      `;

      // Convert SVG to data URL and create native image
      const dataURL = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      return nativeImage.createFromDataURL(dataURL);

    } catch (error) {
      log.error('Failed to create badge icon:', error);
      return null;
    }
  }

  public clearBadge(): void {
    this.updateBadge(0);
  }

  public getCurrentCount(): number {
    return this.currentCount;
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  public destroy(): void {
    try {
      this.clearBadge();
      this.mainWindow = null;
      log.debug('BadgeManager destroyed');
    } catch (error) {
      log.error('Error destroying BadgeManager:', error);
    }
  }
}