export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoHideMenuBar: boolean;
  alwaysOnTop: boolean;
  startMinimized: boolean;
  enableNotifications: boolean;
  zoomLevel: number;
  customCSS: string;
  blockedKeywords: string[];
  autoUpdate: boolean;
}

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'low' | 'normal' | 'critical';
}

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
}

export type IPCChannel = 
  | 'app:get-version'
  | 'app:quit'
  | 'app:minimize'
  | 'app:maximize'
  | 'app:unmaximize'
  | 'app:close'
  | 'app:toggle-fullscreen'
  | 'app:set-always-on-top'
  | 'app:get-system-info'
  | 'app:restore'
  | 'app:log-error'
  | 'app:log-performance'
  | 'window:get-state'
  | 'window:set-state'
  | 'window:reload'
  | 'window:dev-tools'
  | 'window:go-back'
  | 'window:go-forward'
  | 'window:zoom-in'
  | 'window:zoom-out'
  | 'window:reset-zoom'
  | 'window:set-zoom'
  | 'window:load-url'
  | 'window:center'
  | 'window:focus'
  | 'window:save-state'
  | 'window:get-position'
  | 'window:state-changed'
  | 'window:maximized'
  | 'window:unmaximized'
  | 'window:minimized'
  | 'window:restored'
  | 'window:enter-fullscreen'
  | 'window:leave-fullscreen'
  | 'settings:get'
  | 'settings:set'
  | 'settings:reset'
  | 'settings:updated'
  | 'theme:get'
  | 'theme:set'
  | 'theme:toggle'
  | 'notifications:show'
  | 'notifications:permission'
  | 'updater:check'
  | 'updater:download'
  | 'updater:install'
  | 'updater:status'
  | 'storage:get'
  | 'storage:set'
  | 'storage:delete'
  | 'storage:clear'
  | 'storage:clear-cache'
  | 'menu:show-context'
  | 'shortcuts:register'
  | 'shortcuts:unregister'
  | 'url:open-external'
  | 'messages:get-count'
  | 'messages:force-check'
  | 'messages:toggle-polling';

export interface IPCMessage<T = any> {
  channel: IPCChannel;
  data?: T;
  requestId?: string;
}

export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

export interface ElectronAPI {
  platform: string;
  versions: NodeJS.ProcessVersions;
  invoke(channel: IPCChannel, data?: any): Promise<IPCResponse>;
  send(channel: IPCChannel, data?: any): void;
  on(channel: IPCChannel, callback: (data: any) => void): () => void;
  off(channel: IPCChannel, callback: (data: any) => void): void;
  showNotification(data: NotificationData): void;
  openExternal(url: string): void;
  getSystemInfo(): SystemInfo;
}