import { BrowserWindow } from 'electron';

export interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  appName: string;
  appVersion: string;
  userDataPath: string;
  resourcesPath: string;
}

export interface WindowConfig {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  title?: string;
  icon?: string;
  show: boolean;
  autoHideMenuBar: boolean;
  titleBarStyle: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';
  trafficLightPosition?: { x: number; y: number };
  webPreferences: {
    nodeIntegration: boolean;
    contextIsolation: boolean;
    preload: string;
    webSecurity: boolean;
    allowRunningInsecureContent: boolean;
    experimentalFeatures: boolean;
  };
}

export interface AppWindow {
  id: number;
  window: BrowserWindow;
  type: 'main' | 'settings' | 'about';
  isReady: boolean;
  isDestroyed: boolean;
}

export interface MenuTemplate {
  label: string;
  submenu?: MenuTemplate[];
  role?: string;
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  click?: () => void;
  accelerator?: string;
  enabled?: boolean;
  visible?: boolean;
  checked?: boolean;
}

export interface GlobalShortcut {
  accelerator: string;
  callback: () => void;
  description: string;
  enabled: boolean;
}

export interface TrayConfig {
  icon: string;
  tooltip: string;
  contextMenu: MenuTemplate[];
}

export interface SecurityPolicy {
  allowedOrigins: string[];
  blockedOrigins: string[];
  allowedProtocols: string[];
  enableCSP: boolean;
  cspDirectives: Record<string, string>;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  windowCount: number;
  uptime: number;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  source: 'main' | 'renderer' | 'preload';
}