import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { WindowManager } from '../../src/main/window-manager';
import { BrowserWindow, BrowserView } from 'electron';

// Mock the dependencies
jest.mock('electron');
jest.mock('electron-window-state');

describe('WindowManager', () => {
  let windowManager: WindowManager;
  let mockWindow: any;
  let mockBrowserView: any;

  beforeEach(() => {
    // Create mock instances
    mockWindow = {
      id: 1,
      loadFile: jest.fn(() => Promise.resolve()),
      loadURL: jest.fn(() => Promise.resolve()),
      show: jest.fn(),
      hide: jest.fn(),
      focus: jest.fn(),
      close: jest.fn(),
      destroy: jest.fn(),
      isDestroyed: jest.fn(() => false),
      isVisible: jest.fn(() => true),
      isMinimized: jest.fn(() => false),
      isMaximized: jest.fn(() => false),
      isFullScreen: jest.fn(() => false),
      setAlwaysOnTop: jest.fn(),
      setFullScreen: jest.fn(),
      minimize: jest.fn(),
      maximize: jest.fn(),
      unmaximize: jest.fn(),
      restore: jest.fn(),
      setBounds: jest.fn(),
      getBounds: jest.fn(() => ({ x: 0, y: 0, width: 1200, height: 800 })),
      center: jest.fn(),
      setTitle: jest.fn(),
      setBrowserView: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      webContents: {
        openDevTools: jest.fn(),
        closeDevTools: jest.fn(),
        reload: jest.fn(),
        reloadIgnoringCache: jest.fn(),
        loadURL: jest.fn(() => Promise.resolve()),
        executeJavaScript: jest.fn(() => Promise.resolve()),
        insertCSS: jest.fn(() => Promise.resolve()),
        setZoomLevel: jest.fn(),
        getZoomLevel: jest.fn(() => 0),
        canGoBack: jest.fn(() => false),
        canGoForward: jest.fn(() => false),
        goBack: jest.fn(),
        goForward: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
        session: {
          clearStorageData: jest.fn(() => Promise.resolve())
        }
      }
    };

    mockBrowserView = {
      setBounds: jest.fn(),
      destroy: jest.fn(),
      webContents: {
        loadURL: jest.fn(() => Promise.resolve()),
        reload: jest.fn(),
        canGoBack: jest.fn(() => false),
        canGoForward: jest.fn(() => false),
        goBack: jest.fn(),
        goForward: jest.fn(),
        setZoomLevel: jest.fn(),
        getZoomLevel: jest.fn(() => 0),
        insertCSS: jest.fn(() => Promise.resolve()),
        executeJavaScript: jest.fn(() => Promise.resolve()),
        focus: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn()
      }
    };

    // Mock constructors
    (BrowserWindow as jest.MockedClass<typeof BrowserWindow>).mockImplementation(() => mockWindow);
    (BrowserView as jest.MockedClass<typeof BrowserView>).mockImplementation(() => mockBrowserView);

    windowManager = new WindowManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMainWindow', () => {
    test('should create and configure main window', async () => {
      const window = await windowManager.createMainWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          minWidth: expect.any(Number),
          minHeight: expect.any(Number),
          show: false,
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: expect.stringContaining('preload.js'),
            webSecurity: expect.any(Boolean)
          })
        })
      );

      expect(window).toBe(mockWindow);
      expect(mockWindow.loadFile).toHaveBeenCalled();
    });

    test('should create browser view for X.com', async () => {
      await windowManager.createMainWindow();

      expect(BrowserView).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: expect.any(Boolean)
          })
        })
      );

      expect(mockWindow.setBrowserView).toHaveBeenCalledWith(mockBrowserView);
      expect(mockBrowserView.webContents.loadURL).toHaveBeenCalledWith('https://x.com/home');
    });

    test('should return existing window if already created', async () => {
      const window1 = await windowManager.createMainWindow();
      const window2 = await windowManager.createMainWindow();

      expect(window1).toBe(window2);
      expect(mockWindow.focus).toHaveBeenCalled();
    });
  });

  describe('window controls', () => {
    beforeEach(async () => {
      await windowManager.createMainWindow();
    });

    test('should reload browser view', () => {
      windowManager.reload();
      expect(mockBrowserView.webContents.reload).toHaveBeenCalled();
    });

    test('should navigate back if possible', () => {
      mockBrowserView.webContents.canGoBack.mockReturnValue(true);
      
      windowManager.goBack();
      
      expect(mockBrowserView.webContents.goBack).toHaveBeenCalled();
    });

    test('should not navigate back if not possible', () => {
      mockBrowserView.webContents.canGoBack.mockReturnValue(false);
      
      windowManager.goBack();
      
      expect(mockBrowserView.webContents.goBack).not.toHaveBeenCalled();
    });

    test('should navigate forward if possible', () => {
      mockBrowserView.webContents.canGoForward.mockReturnValue(true);
      
      windowManager.goForward();
      
      expect(mockBrowserView.webContents.goForward).toHaveBeenCalled();
    });

    test('should toggle fullscreen', () => {
      mockWindow.isFullScreen.mockReturnValue(false);
      
      windowManager.toggleFullscreen();
      
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true);
    });

    test('should minimize window', () => {
      windowManager.minimize();
      expect(mockWindow.minimize).toHaveBeenCalled();
    });

    test('should maximize window when not maximized', () => {
      mockWindow.isMaximized.mockReturnValue(false);
      
      windowManager.maximize();
      
      expect(mockWindow.maximize).toHaveBeenCalled();
    });

    test('should unmaximize window when maximized', () => {
      mockWindow.isMaximized.mockReturnValue(true);
      
      windowManager.maximize();
      
      expect(mockWindow.unmaximize).toHaveBeenCalled();
    });

    test('should close window', () => {
      windowManager.close();
      expect(mockWindow.close).toHaveBeenCalled();
    });

    test('should hide window', () => {
      windowManager.hide();
      expect(mockWindow.hide).toHaveBeenCalled();
    });

    test('should show window', () => {
      windowManager.show();
      expect(mockWindow.show).toHaveBeenCalled();
    });

    test('should focus window', () => {
      windowManager.focus();
      expect(mockWindow.focus).toHaveBeenCalled();
    });
  });

  describe('zoom controls', () => {
    beforeEach(async () => {
      await windowManager.createMainWindow();
    });

    test('should zoom in', () => {
      mockBrowserView.webContents.getZoomLevel.mockReturnValue(0);
      
      windowManager.zoomIn();
      
      expect(mockBrowserView.webContents.setZoomLevel).toHaveBeenCalledWith(0.5);
    });

    test('should zoom out', () => {
      mockBrowserView.webContents.getZoomLevel.mockReturnValue(0);
      
      windowManager.zoomOut();
      
      expect(mockBrowserView.webContents.setZoomLevel).toHaveBeenCalledWith(-0.5);
    });

    test('should reset zoom', () => {
      windowManager.resetZoom();
      expect(mockBrowserView.webContents.setZoomLevel).toHaveBeenCalledWith(0);
    });

    test('should set specific zoom level', () => {
      windowManager.setZoomLevel(1.5);
      expect(mockBrowserView.webContents.setZoomLevel).toHaveBeenCalledWith(1.5);
    });

    test('should limit zoom level to maximum', () => {
      windowManager.setZoomLevel(5);
      expect(mockBrowserView.webContents.setZoomLevel).toHaveBeenCalledWith(3);
    });

    test('should limit zoom level to minimum', () => {
      windowManager.setZoomLevel(-5);
      expect(mockBrowserView.webContents.setZoomLevel).toHaveBeenCalledWith(-3);
    });
  });

  describe('URL navigation', () => {
    beforeEach(async () => {
      await windowManager.createMainWindow();
    });

    test('should load URL in browser view', () => {
      const url = 'https://x.com/explore';
      
      windowManager.loadUrl(url);
      
      expect(mockBrowserView.webContents.loadURL).toHaveBeenCalledWith(url);
    });
  });

  describe('window state', () => {
    beforeEach(async () => {
      await windowManager.createMainWindow();
    });

    test('should get window state', () => {
      const expectedState = {
        width: 1200,
        height: 800,
        x: 0,
        y: 0,
        isMaximized: false,
        isFullScreen: false
      };

      mockWindow.getBounds.mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 });
      mockWindow.isMaximized.mockReturnValue(false);
      mockWindow.isFullScreen.mockReturnValue(false);

      const state = windowManager.getWindowState();

      expect(state).toEqual(expectedState);
    });

    test('should return null when no main window', () => {
      const newWindowManager = new WindowManager();
      const state = newWindowManager.getWindowState();
      expect(state).toBeNull();
    });
  });

  describe('dev tools', () => {
    beforeEach(async () => {
      await windowManager.createMainWindow();
    });

    test('should open dev tools', () => {
      windowManager.openDevTools();
      expect(mockBrowserView.webContents.openDevTools).toHaveBeenCalledWith({ mode: 'detach' });
    });

    test('should close dev tools', () => {
      windowManager.closeDevTools();
      expect(mockBrowserView.webContents.closeDevTools).toHaveBeenCalled();
    });
  });

  describe('theme management', () => {
    beforeEach(async () => {
      await windowManager.createMainWindow();
    });

    test('should update theme to dark', () => {
      windowManager.updateTheme('dark');
      
      expect(mockBrowserView.webContents.insertCSS).toHaveBeenCalledWith(
        expect.stringContaining('color-scheme: dark')
      );
    });

    test('should update theme to light', () => {
      windowManager.updateTheme('light');
      
      expect(mockBrowserView.webContents.insertCSS).toHaveBeenCalledWith(
        expect.stringContaining('color-scheme: light')
      );
    });
  });
});