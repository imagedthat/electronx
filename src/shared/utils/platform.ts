import { platform, arch, release } from 'os';
import { app } from 'electron';

export const Platform = {
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isUnix: process.platform !== 'win32',
  
  get current() {
    return process.platform;
  },
  
  get architecture() {
    return arch();
  },
  
  get release() {
    return release();
  },
  
  get versions() {
    return {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      v8: process.versions.v8,
      os: `${platform()} ${release()}`,
      arch: arch()
    };
  }
} as const;

export const getAppInfo = () => {
  if (!app) {
    return {
      name: 'ElectronX',
      version: '1.0.0',
      isPackaged: false,
      isReady: false
    };
  }

  return {
    name: app.getName(),
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    isReady: app.isReady(),
    paths: {
      userData: app.getPath('userData'),
      appData: app.getPath('appData'),
      temp: app.getPath('temp'),
      desktop: app.getPath('desktop'),
      documents: app.getPath('documents'),
      downloads: app.getPath('downloads'),
      logs: app.getPath('logs')
    }
  };
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || !app?.isPackaged;
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production' && app?.isPackaged;
};

export const getSystemTheme = (): 'light' | 'dark' => {
  if (Platform.isMacOS) {
    return process.platform === 'darwin' && 
           require('electron').nativeTheme?.shouldUseDarkColors ? 'dark' : 'light';
  }
  
  if (Platform.isWindows) {
    try {
      const { execSync } = require('child_process');
      const result = execSync('reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize /v AppsUseLightTheme', 
        { encoding: 'utf8' });
      return result.includes('0x0') ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
  
  return 'light';
};