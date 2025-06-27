import { jest } from '@jest/globals';

// Mock Electron
jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '1.0.0'),
    getName: jest.fn(() => 'ElectronX'),
    getPath: jest.fn((name: string) => `/mock/path/${name}`),
    isPackaged: false,
    isReady: jest.fn(() => true),
    dock: {
      show: jest.fn(),
      hide: jest.fn()
    },
    setAsDefaultProtocolClient: jest.fn(),
    removeAllListeners: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    requestSingleInstanceLock: jest.fn(() => true),
    whenReady: jest.fn(() => Promise.resolve()),
    getAppPath: jest.fn(() => '/mock/app/path')
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(() => Promise.resolve()),
    loadURL: jest.fn(() => Promise.resolve()),
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
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
  })),
  BrowserView: jest.fn().mockImplementation(() => ({
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
  })),
  ipcMain: {
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    handle: jest.fn(),
    handleOnce: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn()
  },
  ipcRenderer: {
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    send: jest.fn(),
    invoke: jest.fn(() => Promise.resolve({ success: true })),
    removeAllListeners: jest.fn()
  },
  contextBridge: {
    exposeInMainWorld: jest.fn()
  },
  session: {
    defaultSession: {
      webRequest: {
        onBeforeRequest: jest.fn(),
        onBeforeSendHeaders: jest.fn(),
        onHeadersReceived: jest.fn()
      },
      setPermissionRequestHandler: jest.fn(),
      setPermissionCheckHandler: jest.fn(),
      setCertificateVerifyProc: jest.fn(),
      setWindowOpenHandler: jest.fn(),
      clearStorageData: jest.fn(() => Promise.resolve())
    }
  },
  shell: {
    openExternal: jest.fn(() => Promise.resolve()),
    showItemInFolder: jest.fn(),
    openPath: jest.fn(() => Promise.resolve(''))
  },
  screen: {
    getPrimaryDisplay: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      size: { width: 1920, height: 1080 }
    })),
    getAllDisplays: jest.fn(() => []),
    getDisplayNearestPoint: jest.fn(),
    getDisplayMatching: jest.fn()
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    themeSource: 'system',
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn()
  },
  globalShortcut: {
    register: jest.fn(() => true),
    unregister: jest.fn(),
    unregisterAll: jest.fn(),
    isRegistered: jest.fn(() => false)
  },
  Menu: {
    setApplicationMenu: jest.fn(),
    buildFromTemplate: jest.fn(() => ({
      items: [],
      popup: jest.fn()
    })),
    getApplicationMenu: jest.fn()
  },
  MenuItem: jest.fn(),
  dialog: {
    showOpenDialog: jest.fn(() => Promise.resolve({ canceled: false, filePaths: [] })),
    showSaveDialog: jest.fn(() => Promise.resolve({ canceled: false, filePath: '' })),
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })),
    showErrorBox: jest.fn(),
    showCertificateTrustDialog: jest.fn(() => Promise.resolve())
  },
  Notification: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn()
  })),
  nativeImage: {
    createFromPath: jest.fn(() => ({})),
    createFromBuffer: jest.fn(() => ({})),
    createFromDataURL: jest.fn(() => ({})),
    createEmpty: jest.fn(() => ({}))
  },
  protocol: {
    registerFileProtocol: jest.fn(),
    registerHttpProtocol: jest.fn(),
    registerStreamProtocol: jest.fn(),
    unregisterProtocol: jest.fn(),
    isProtocolRegistered: jest.fn(() => false)
  },
  powerMonitor: {
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    getSystemIdleState: jest.fn(() => 'active'),
    getSystemIdleTime: jest.fn(() => 0)
  }
}));

// Mock electron-log
jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn(),
  log: jest.fn(),
  transports: {
    file: {
      level: 'info',
      format: '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
    },
    console: {
      level: 'info',
      format: '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
    }
  }
}));

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    has: jest.fn(() => false),
    size: 0,
    store: {}
  }));
});

// Mock electron-updater
jest.mock('electron-updater', () => ({
  autoUpdater: {
    checkForUpdates: jest.fn(() => Promise.resolve()),
    downloadUpdate: jest.fn(() => Promise.resolve()),
    quitAndInstall: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    logger: null,
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    allowDowngrade: false,
    setFeedURL: jest.fn()
  }
}));

// Mock electron-window-state
jest.mock('electron-window-state', () => {
  return jest.fn(() => ({
    x: 100,
    y: 100,
    width: 1200,
    height: 800,
    isMaximized: false,
    manage: jest.fn(),
    unmanage: jest.fn(),
    saveState: jest.fn()
  }));
});

// Mock node-notifier
jest.mock('node-notifier', () => ({
  notify: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn()
}));

// Mock semver
jest.mock('semver', () => ({
  gt: jest.fn(() => false),
  lt: jest.fn(() => false),
  eq: jest.fn(() => true),
  valid: jest.fn(() => '1.0.0'),
  clean: jest.fn(() => '1.0.0'),
  satisfies: jest.fn(() => true)
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(() => Promise.resolve('mock file content')),
  writeFile: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({ isDirectory: () => false, isFile: () => true })),
  unlink: jest.fn(() => Promise.resolve()),
  readdir: jest.fn(() => Promise.resolve([])),
  access: jest.fn(() => Promise.resolve())
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(() => 'mock file content'),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(() => ({ isDirectory: () => false, isFile: () => true }))
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  resolve: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path: string) => path.split('/').pop() || ''),
  extname: jest.fn((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
  sep: '/',
  delimiter: ':'
}));

// Mock os
jest.mock('os', () => ({
  platform: jest.fn(() => 'darwin'),
  arch: jest.fn(() => 'x64'),
  release: jest.fn(() => '21.0.0'),
  tmpdir: jest.fn(() => '/tmp'),
  homedir: jest.fn(() => '/home/user'),
  hostname: jest.fn(() => 'localhost'),
  type: jest.fn(() => 'Darwin'),
  userInfo: jest.fn(() => ({ username: 'testuser', homedir: '/home/testuser' }))
}));

// Mock process.versions
Object.defineProperty(process, 'versions', {
  value: {
    electron: '28.0.0',
    chrome: '120.0.0.0',
    node: '18.17.1',
    v8: '12.0.267.17'
  },
  writable: false
});

// Mock process.platform
Object.defineProperty(process, 'platform', {
  value: 'darwin',
  writable: false
});

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Export commonly used mocks for tests
export const mockElectronApp = {
  getVersion: jest.fn(() => '1.0.0'),
  getName: jest.fn(() => 'ElectronX'),
  getPath: jest.fn((name: string) => `/mock/path/${name}`),
  isPackaged: false,
  isReady: jest.fn(() => true),
  quit: jest.fn(),
  on: jest.fn(),
  emit: jest.fn()
};

export const mockBrowserWindow = {
  loadFile: jest.fn(() => Promise.resolve()),
  loadURL: jest.fn(() => Promise.resolve()),
  show: jest.fn(),
  hide: jest.fn(),
  focus: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  webContents: {
    send: jest.fn(),
    on: jest.fn(),
    loadURL: jest.fn(() => Promise.resolve())
  }
};

export const mockIpcMain = {
  on: jest.fn(),
  handle: jest.fn(),
  removeAllListeners: jest.fn()
};

export const mockStore = {
  get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  has: jest.fn(() => false)
};