import { Menu, MenuItem, shell, dialog, app } from 'electron';
import log from 'electron-log';

import { WindowManager } from './window-manager';
import { Platform, isDevelopment } from '../shared/utils/platform';
import { APP_CONFIG, FEATURE_FLAGS } from '../shared/constants/config';
import { X_URLS } from '../shared/constants/urls';

export class MenuBuilder {
  private windowManager: WindowManager;
  private menu: Menu | null = null;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  public async buildMenu(): Promise<void> {
    try {
      const template = this.createMenuTemplate();
      this.menu = Menu.buildFromTemplate(template);
      
      Menu.setApplicationMenu(this.menu);
      
      log.info('Application menu built and set');
    } catch (error) {
      log.error('Failed to build menu:', error);
      throw error;
    }
  }

  private createMenuTemplate(): any[] {
    if (Platform.isMacOS) {
      return this.createMacOSMenuTemplate();
    } else {
      return this.createWindowsLinuxMenuTemplate();
    }
  }

  private createMacOSMenuTemplate(): any[] {
    return [
      // App Menu (macOS specific)
      {
        label: APP_CONFIG.APP_NAME,
        submenu: [
          {
            label: `About ${APP_CONFIG.APP_NAME}`,
            click: () => this.showAboutDialog()
          },
          { type: 'separator' },
          {
            label: 'Preferences...',
            accelerator: 'Cmd+,',
            click: () => this.openSettings()
          },
          { type: 'separator' },
          {
            label: 'Services',
            role: 'services',
            submenu: []
          },
          { type: 'separator' },
          {
            label: `Hide ${APP_CONFIG.APP_NAME}`,
            accelerator: 'Cmd+H',
            role: 'hide'
          },
          {
            label: 'Hide Others',
            accelerator: 'Cmd+Alt+H',
            role: 'hideothers'
          },
          {
            label: 'Show All',
            role: 'unhide'
          },
          { type: 'separator' },
          {
            label: `Quit ${APP_CONFIG.APP_NAME}`,
            accelerator: 'Cmd+Q',
            click: () => app.quit()
          }
        ]
      },
      
      // File Menu
      this.createFileMenu(),
      
      // Edit Menu
      this.createEditMenu(),
      
      // View Menu
      this.createViewMenu(),
      
      // Navigate Menu
      this.createNavigateMenu(),
      
      // Window Menu
      this.createWindowMenu(),
      
      // Help Menu
      this.createHelpMenu()
    ];
  }

  private createWindowsLinuxMenuTemplate(): any[] {
    return [
      // File Menu
      this.createFileMenu(),
      
      // Edit Menu
      this.createEditMenu(),
      
      // View Menu
      this.createViewMenu(),
      
      // Navigate Menu
      this.createNavigateMenu(),
      
      // Tools Menu
      this.createToolsMenu(),
      
      // Help Menu
      this.createHelpMenu()
    ];
  }

  private createFileMenu(): any {
    return {
      label: 'File',
      submenu: [
        {
          label: 'New Tweet',
          accelerator: 'CmdOrCtrl+N',
          click: () => this.navigateToUrl(X_URLS.COMPOSE)
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => this.windowManager.reload()
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        { type: 'separator' },
        ...(!Platform.isMacOS ? [
          {
            label: 'Preferences',
            accelerator: 'Ctrl+,',
            click: () => this.openSettings()
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: 'Ctrl+Q',
            click: () => app.quit()
          }
        ] : [])
      ]
    };
  }

  private createEditMenu(): any {
    return {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                document.dispatchEvent(new KeyboardEvent('keydown', {
                  key: 'f',
                  ctrlKey: ${!Platform.isMacOS},
                  metaKey: ${Platform.isMacOS},
                  bubbles: true
                }));
              `);
            }
          }
        }
      ]
    };
  }

  private createViewMenu(): any {
    return {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => this.windowManager.reload()
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => this.windowManager.resetZoom()
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => this.windowManager.zoomIn()
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => this.windowManager.zoomOut()
        },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: Platform.isMacOS ? 'Ctrl+Cmd+F' : 'F11',
          click: () => this.windowManager.toggleFullscreen()
        },
        { type: 'separator' },
        {
          label: 'Side Panel',
          accelerator: 'CmdOrCtrl+Shift+S',
          type: 'checkbox',
          checked: false,
          click: (menuItem: Electron.MenuItem) => {
            this.toggleSidePanel(menuItem.checked);
          }
        },
        { type: 'separator' },
        ...(FEATURE_FLAGS.ENABLE_DEV_TOOLS ? [
          {
            label: 'Developer Tools',
            accelerator: Platform.isMacOS ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
            click: () => this.windowManager.openDevTools()
          }
        ] : [])
      ]
    };
  }

  private createNavigateMenu(): any {
    return {
      label: 'Navigate',
      submenu: [
        {
          label: 'Back',
          accelerator: 'CmdOrCtrl+Left',
          click: () => this.windowManager.goBack()
        },
        {
          label: 'Forward',
          accelerator: 'CmdOrCtrl+Right',
          click: () => this.windowManager.goForward()
        },
        { type: 'separator' },
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+1',
          click: () => this.navigateToUrl(X_URLS.HOME)
        },
        {
          label: 'Explore',
          accelerator: 'CmdOrCtrl+2',
          click: () => this.navigateToUrl(X_URLS.EXPLORE)
        },
        {
          label: 'Notifications',
          accelerator: 'CmdOrCtrl+3',
          click: () => this.navigateToUrl(X_URLS.NOTIFICATIONS)
        },
        {
          label: 'Messages',
          accelerator: 'CmdOrCtrl+4',
          click: () => this.navigateToUrl(X_URLS.MESSAGES)
        },
        {
          label: 'Bookmarks',
          accelerator: 'CmdOrCtrl+5',
          click: () => this.navigateToUrl(X_URLS.BOOKMARKS)
        },
        {
          label: 'Lists',
          accelerator: 'CmdOrCtrl+6',
          click: () => this.navigateToUrl(X_URLS.LISTS)
        },
        {
          label: 'Communities',
          accelerator: 'CmdOrCtrl+7',
          click: () => this.navigateToUrl(X_URLS.COMMUNITIES)
        },
        { type: 'separator' },
        {
          label: 'Profile',
          click: () => this.navigateToUrl(X_URLS.PROFILE)
        },
        {
          label: 'Settings',
          click: () => this.navigateToUrl(X_URLS.SETTINGS)
        }
      ]
    };
  }

  private createWindowMenu(): any {
    return {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        },
        { type: 'separator' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          checked: false,
          click: (menuItem: Electron.MenuItem) => {
            this.toggleAlwaysOnTop(menuItem.checked);
          }
        },
        { type: 'separator' },
        {
          label: 'Bring All to Front',
          role: 'front'
        }
      ]
    };
  }

  private createToolsMenu(): any {
    return {
      label: 'Tools',
      submenu: [
        {
          label: 'Preferences',
          accelerator: 'Ctrl+,',
          click: () => this.openSettings()
        },
        { type: 'separator' },
        {
          label: 'Clear Cache',
          click: () => this.clearCache()
        },
        {
          label: 'Reset Zoom',
          accelerator: 'Ctrl+0',
          click: () => this.windowManager.resetZoom()
        },
        { type: 'separator' },
        ...(FEATURE_FLAGS.ENABLE_DEV_TOOLS ? [
          {
            label: 'Developer Tools',
            accelerator: 'Ctrl+Shift+I',
            click: () => this.windowManager.openDevTools()
          }
        ] : [])
      ]
    };
  }

  private createHelpMenu(): any {
    return {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: () => this.showKeyboardShortcuts()
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/imagedthat/electronx/issues')
        },
        {
          label: 'View Source Code',
          click: () => shell.openExternal('https://github.com/imagedthat/electronx')
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => this.checkForUpdates()
        },
        ...(!Platform.isMacOS ? [
          { type: 'separator' },
          {
            label: `About ${APP_CONFIG.APP_NAME}`,
            click: () => this.showAboutDialog()
          }
        ] : [])
      ]
    };
  }

  // Menu action handlers
  private navigateToUrl(url: string): void {
    try {
      this.windowManager.loadUrl(url);
      log.debug('Navigated to:', url);
    } catch (error) {
      log.error('Failed to navigate to URL:', error);
    }
  }

  private openSettings(): void {
    try {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('menu:open-settings');
      }
    } catch (error) {
      log.error('Failed to open settings:', error);
    }
  }

  private toggleSidePanel(show: boolean): void {
    try {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('menu:toggle-side-panel', { show });
      }
    } catch (error) {
      log.error('Failed to toggle side panel:', error);
    }
  }

  private toggleAlwaysOnTop(alwaysOnTop: boolean): void {
    try {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.setAlwaysOnTop(alwaysOnTop);
        log.debug('Always on top:', alwaysOnTop);
      }
    } catch (error) {
      log.error('Failed to toggle always on top:', error);
    }
  }

  private async clearCache(): Promise<void> {
    try {
      const mainWindow = this.windowManager.getMainWindow();
      if (!mainWindow) return;

      const response = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Clear Cache', 'Cancel'],
        defaultId: 0,
        title: 'Clear Cache',
        message: 'Are you sure you want to clear the cache?',
        detail: 'This will remove all cached data and may require you to log in again.'
      });

      if (response.response === 0) {
        await mainWindow.webContents.session.clearStorageData();
        this.windowManager.reload();
        log.info('Cache cleared');
      }
    } catch (error) {
      log.error('Failed to clear cache:', error);
    }
  }

  private showKeyboardShortcuts(): void {
    try {
      const shortcuts = [
        'Navigation:',
        'Ctrl/Cmd + 1-7: Quick navigation',
        'Ctrl/Cmd + R: Reload',
        'Ctrl/Cmd + N: New tweet',
        'Ctrl/Cmd + F: Find',
        '',
        'View:',
        'Ctrl/Cmd + Plus: Zoom in',
        'Ctrl/Cmd + Minus: Zoom out',
        'Ctrl/Cmd + 0: Reset zoom',
        'F11 (Ctrl+Cmd+F on Mac): Fullscreen',
        '',
        'Window:',
        'Ctrl/Cmd + Shift + S: Toggle side panel',
        'Ctrl/Cmd + ,: Preferences',
        'Ctrl/Cmd + M: Minimize',
        'Ctrl/Cmd + W: Close'
      ];

      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Keyboard Shortcuts',
          message: 'ElectronX Keyboard Shortcuts',
          detail: shortcuts.join('\n')
        });
      }
    } catch (error) {
      log.error('Failed to show keyboard shortcuts:', error);
    }
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('menu:check-updates');
      }
    } catch (error) {
      log.error('Failed to check for updates:', error);
    }
  }

  private showAboutDialog(): void {
    try {
      const mainWindow = this.windowManager.getMainWindow();
      if (!mainWindow) return;

      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: `About ${APP_CONFIG.APP_NAME}`,
        message: APP_CONFIG.APP_NAME,
        detail: [
          `Version: ${APP_CONFIG.VERSION}`,
          `Electron: ${process.versions.electron}`,
          `Chrome: ${process.versions.chrome}`,
          `Node.js: ${process.versions.node}`,
          '',
          'A secure, cross-platform desktop wrapper for X.com',
          '',
          'Copyright © 2024 ElectronX Team',
          'Licensed under MIT License'
        ].join('\n')
      });
    } catch (error) {
      log.error('Failed to show about dialog:', error);
    }
  }

  // Context menu for the browser view
  public createContextMenu(params: any): Menu {
    const template: any[] = [];

    // Add cut/copy/paste if editable
    if (params.isEditable) {
      template.push(
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        { type: 'separator' }
      );
    } else if (params.selectionText) {
      template.push(
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        { type: 'separator' }
      );
    }

    // Add link context menu items
    if (params.linkURL) {
      template.push(
        {
          label: 'Open Link in Browser',
          click: () => shell.openExternal(params.linkURL)
        },
        {
          label: 'Copy Link Address',
          click: () => {
            require('electron').clipboard.writeText(params.linkURL);
          }
        },
        { type: 'separator' }
      );
    }

    // Add image context menu items
    if (params.hasImageContents) {
      template.push(
        {
          label: 'Copy Image',
          click: () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.copyImageAt(params.x, params.y);
            }
          }
        },
        {
          label: 'Save Image As...',
          click: () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.downloadURL(params.srcURL);
            }
          }
        },
        { type: 'separator' }
      );
    }

    // Add navigation items
    template.push(
      {
        label: 'Back',
        enabled: this.canGoBack(),
        click: () => this.windowManager.goBack()
      },
      {
        label: 'Forward',
        enabled: this.canGoForward(),
        click: () => this.windowManager.goForward()
      },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: () => this.windowManager.reload()
      }
    );

    // Add developer tools if enabled
    if (FEATURE_FLAGS.ENABLE_DEV_TOOLS) {
      template.push(
        { type: 'separator' },
        {
          label: 'Inspect Element',
          click: () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.inspectElement(params.x, params.y);
            }
          }
        }
      );
    }

    return Menu.buildFromTemplate(template);
  }

  private canGoBack(): boolean {
    const browserView = this.windowManager.getBrowserView();
    return browserView ? browserView.webContents.canGoBack() : false;
  }

  private canGoForward(): boolean {
    const browserView = this.windowManager.getBrowserView();
    return browserView ? browserView.webContents.canGoForward() : false;
  }

  public updateMenu(): void {
    try {
      // Update dynamic menu items (like checkboxes)
      if (this.menu) {
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow) {
          // Update always on top checkbox
          const windowMenu = this.menu.items.find(item => item.label === 'Window');
          if (windowMenu && windowMenu.submenu) {
            const alwaysOnTopItem = windowMenu.submenu.items.find(item => item.label === 'Always on Top');
            if (alwaysOnTopItem) {
              alwaysOnTopItem.checked = mainWindow.isAlwaysOnTop();
            }
          }
        }
      }
    } catch (error) {
      log.error('Failed to update menu:', error);
    }
  }

  public getMenu(): Menu | null {
    return this.menu;
  }
}