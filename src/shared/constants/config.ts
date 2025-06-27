import { app } from 'electron';
import path from 'path';

export const APP_CONFIG = {
  APP_NAME: 'X.com',
  APP_ID: 'com.x.desktop',
  VERSION: app?.getVersion() || '1.0.0',
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  RESOURCES_PATH: app?.getAppPath() || process.cwd(),
  USER_DATA_PATH: app?.getPath('userData') || path.join(process.cwd(), 'userData')
} as const;

export const WINDOW_CONFIG = {
  DEFAULT_WIDTH: 1200,
  DEFAULT_HEIGHT: 800,
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
  MAX_WIDTH: 2560,
  MAX_HEIGHT: 1440,
  TITLE_BAR_HEIGHT: 32,
  SIDE_PANEL_WIDTH: 280
} as const;

export const SECURITY_CONFIG = {
  CSP_DIRECTIVE: `
    default-src 'self' https://x.com https://twitter.com https://*.twimg.com https://t.co;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://x.com https://twitter.com https://*.twimg.com;
    style-src 'self' 'unsafe-inline' https://x.com https://twitter.com https://*.twimg.com;
    img-src 'self' data: blob: https: http:;
    media-src 'self' blob: https: http:;
    font-src 'self' data: https://x.com https://twitter.com https://*.twimg.com;
    connect-src 'self' https://x.com https://twitter.com https://*.twimg.com https://api.twitter.com wss://*.x.com wss://*.twitter.com;
    frame-src 'self' https://x.com https://twitter.com https://*.twimg.com;
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://x.com https://twitter.com;
  `.replace(/\s+/g, ' ').trim(),
  
  ALLOWED_PERMISSIONS: [
    'notifications',
    'clipboard-read',
    'clipboard-write'
  ] as const,
  
  BLOCKED_PERMISSIONS: [
    'geolocation',
    'camera',
    'microphone',
    'midi',
    'push',
    'background-sync'
  ] as const
} as const;

export const STORAGE_CONFIG = {
  SETTINGS_FILE: 'settings.json',
  WINDOW_STATE_FILE: 'window-state.json',
  CACHE_DIR: 'cache',
  LOGS_DIR: 'logs',
  MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_LOG_FILES: 5
} as const;

export const UPDATE_CONFIG = {
  CHECK_INTERVAL: 4 * 60 * 60 * 1000, // 4 hours
  AUTO_DOWNLOAD: true,
  AUTO_INSTALL_ON_APP_QUIT: true,
  ALLOW_PRERELEASE: false,
  ALLOW_DOWNGRADE: false
} as const;

export const PERFORMANCE_CONFIG = {
  MAX_MEMORY_USAGE: 512 * 1024 * 1024, // 512MB
  GC_INTERVAL: 30 * 1000, // 30 seconds
  ENABLE_HARDWARE_ACCELERATION: true,
  DISABLE_GPU_SANDBOX: false
} as const;

export const FEATURE_FLAGS = {
  ENABLE_SIDE_PANEL: true,
  ENABLE_CUSTOM_TITLE_BAR: true,
  ENABLE_SYSTEM_TRAY: true,
  ENABLE_GLOBAL_SHORTCUTS: true,
  ENABLE_AUTO_UPDATER: true,
  ENABLE_CRASH_REPORTER: true,
  ENABLE_TELEMETRY: false,
  ENABLE_DEV_TOOLS: APP_CONFIG.IS_DEV
} as const;