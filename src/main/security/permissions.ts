import { session, shell, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';

import { CSPManager } from './csp';
import { SECURITY_CONFIG } from '../../shared/constants/config';
import { isAllowedDomain, sanitizeUrl } from '../../shared/utils/validation';

export class SecurityManager {
  private cspManager: CSPManager;
  private blockedUrls: Set<string> = new Set();
  private allowedPermissions: Set<string> = new Set(SECURITY_CONFIG.ALLOWED_PERMISSIONS);
  private deniedPermissions: Set<string> = new Set(SECURITY_CONFIG.BLOCKED_PERMISSIONS);

  constructor() {
    this.cspManager = CSPManager.getInstance();
    // Security setup will be called when app is ready
  }

  public async initialize(): Promise<void> {
    this.setupPermissionHandlers();
    this.setupRequestFilters();
    this.setupProtocolHandlers();
    this.setupWebContentsHandlers();
    log.info('SecurityManager initialized');
  }

  private setupPermissionHandlers(): void {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      log.debug('Permission request:', { permission, details });

      // Block explicitly denied permissions
      if (this.deniedPermissions.has(permission)) {
        log.warn('Denied permission request:', permission);
        callback(false);
        return;
      }

      // Allow explicitly allowed permissions
      if (this.allowedPermissions.has(permission)) {
        log.info('Granted permission request:', permission);
        callback(true);
        return;
      }

      // Handle special cases
      switch (permission) {
        case 'notifications':
          this.handleNotificationPermission(webContents, callback);
          break;
        
        case 'clipboard-read':
        case 'clipboard-sanitized-write':
          callback(true);
          break;
        
        case 'media':
          this.handleMediaPermission(webContents, callback, details);
          break;
        
        default:
          log.warn('Unknown permission request, denying:', permission);
          callback(false);
      }
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      log.debug('Permission check:', { permission, requestingOrigin, details });

      // Check if origin is allowed
      if (!isAllowedDomain(requestingOrigin)) {
        log.warn('Permission check denied for disallowed origin:', requestingOrigin);
        return false;
      }

      // Allow specific permissions for X.com
      if (requestingOrigin.includes('x.com') || requestingOrigin.includes('twitter.com')) {
        return this.allowedPermissions.has(permission);
      }

      return false;
    });
  }

  private async handleNotificationPermission(webContents: Electron.WebContents, callback: (granted: boolean) => void): Promise<void> {
    try {
      const window = BrowserWindow.fromWebContents(webContents);
      if (!window) {
        callback(false);
        return;
      }

      const response = await dialog.showMessageBox(window, {
        type: 'question',
        buttons: ['Allow', 'Block'],
        defaultId: 0,
        title: 'Notification Permission',
        message: 'X.com wants to show notifications',
        detail: 'Allow ElectronX to show desktop notifications from X.com?'
      });

      const granted = response.response === 0;
      log.info('Notification permission:', granted ? 'granted' : 'denied');
      callback(granted);
    } catch (error) {
      log.error('Error handling notification permission:', error);
      callback(false);
    }
  }

  private async handleMediaPermission(
    webContents: Electron.WebContents,
    callback: (granted: boolean) => void,
    details: any
  ): Promise<void> {
    try {
      const window = BrowserWindow.fromWebContents(webContents);
      if (!window) {
        callback(false);
        return;
      }

      const mediaTypes = [];
      if (details.mediaTypes?.includes('video')) mediaTypes.push('camera');
      if (details.mediaTypes?.includes('audio')) mediaTypes.push('microphone');

      const response = await dialog.showMessageBox(window, {
        type: 'question',
        buttons: ['Allow', 'Block'],
        defaultId: 1,
        title: 'Media Permission',
        message: `X.com wants to access your ${mediaTypes.join(' and ')}`,
        detail: 'This is required for video calls and voice messages.'
      });

      const granted = response.response === 0;
      log.info('Media permission:', granted ? 'granted' : 'denied', { mediaTypes });
      callback(granted);
    } catch (error) {
      log.error('Error handling media permission:', error);
      callback(false);
    }
  }

  private setupRequestFilters(): void {
    // Block requests to blocked domains
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      const url = sanitizeUrl(details.url);
      
      if (this.isBlockedUrl(url)) {
        log.warn('Blocked request to:', url);
        callback({ cancel: true });
        return;
      }

      if (!isAllowedDomain(url) && details.resourceType !== 'mainFrame') {
        log.debug('Blocked non-allowed domain request:', url);
        callback({ cancel: true });
        return;
      }

      callback({ cancel: false });
    });

    // Modify headers for security
    session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
      const headers = { ...details.requestHeaders };

      // Add security headers
      headers['X-Requested-With'] = 'ElectronX';
      headers['X-Frame-Options'] = 'DENY';
      headers['X-Content-Type-Options'] = 'nosniff';

      // Remove potentially identifying headers
      delete headers['User-Agent'];
      headers['User-Agent'] = this.getUserAgent();

      callback({ requestHeaders: headers });
    });

    // Add response headers for security
    session.defaultSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
      const headers = { ...details.responseHeaders };

      // Add CSP header
      headers['Content-Security-Policy'] = [this.cspManager.getCSPHeader()];
      
      // Add other security headers
      headers['X-Frame-Options'] = ['DENY'];
      headers['X-Content-Type-Options'] = ['nosniff'];
      headers['Referrer-Policy'] = ['strict-origin-when-cross-origin'];
      headers['Permissions-Policy'] = ['camera=(), microphone=(), geolocation=()'];

      callback({ responseHeaders: headers });
    });
  }

  private setupProtocolHandlers(): void {
    // Handle protocol navigation
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(this.allowedPermissions.has(permission));
    });

    // Handle certificate errors
    session.defaultSession.setCertificateVerifyProc((request, callback) => {
      const { hostname, verificationResult, errorCode } = request;
      
      if (!isAllowedDomain(`https://${hostname}`)) {
        log.warn('Certificate verification failed for disallowed domain:', hostname);
        callback(-2); // Deny
        return;
      }

      if (verificationResult === 'net::OK') {
        callback(0); // Allow
      } else {
        log.warn('Certificate verification failed:', { hostname, verificationResult, errorCode });
        callback(-2); // Deny
      }
    });
  }

  private setupWebContentsHandlers(): void {
    // Handle new window creation is handled in window-manager.ts via webContents.setWindowOpenHandler
    // This method is kept for potential future session-level handlers
  }

  private isBlockedUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();

      // Check blocked domains
      for (const blocked of SECURITY_CONFIG.BLOCKED_PERMISSIONS) {
        if (hostname.includes(blocked)) {
          return true;
        }
      }

      // Check custom blocked URLs
      if (this.blockedUrls.has(url) || this.blockedUrls.has(hostname)) {
        return true;
      }

      // Block known tracking and ad domains
      const adDomains = [
        'doubleclick.net',
        'googleadservices.com',
        'googlesyndication.com',
        'facebook.com/tr',
        'analytics.google.com',
        'google-analytics.com'
      ];

      return adDomains.some(adDomain => hostname.includes(adDomain));
    } catch {
      return true; // Block invalid URLs
    }
  }

  private getUserAgent(): string {
    return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ElectronX/1.0.0';
  }

  // Public methods
  public getCSPHeader(): string {
    return this.cspManager.getCSPHeader();
  }

  public isAllowedNavigation(url: string): boolean {
    if (!isAllowedDomain(url)) {
      return false;
    }

    if (this.isBlockedUrl(url)) {
      return false;
    }

    return true;
  }

  public blockUrl(url: string): void {
    this.blockedUrls.add(url);
    log.info('URL blocked:', url);
  }

  public unblockUrl(url: string): void {
    this.blockedUrls.delete(url);
    log.info('URL unblocked:', url);
  }

  public addAllowedPermission(permission: string): void {
    this.allowedPermissions.add(permission);
    log.info('Permission allowed:', permission);
  }

  public removeAllowedPermission(permission: string): void {
    this.allowedPermissions.delete(permission);
    log.info('Permission removed from allowed list:', permission);
  }

  public addDeniedPermission(permission: string): void {
    this.deniedPermissions.add(permission);
    log.info('Permission denied:', permission);
  }

  public removeDeniedPermission(permission: string): void {
    this.deniedPermissions.delete(permission);
    log.info('Permission removed from denied list:', permission);
  }

  public getSecurityStatus(): any {
    return {
      allowedPermissions: Array.from(this.allowedPermissions),
      deniedPermissions: Array.from(this.deniedPermissions),
      blockedUrls: Array.from(this.blockedUrls),
      cspHeader: this.cspManager.getCSPHeader()
    };
  }

  public clearCache(): void {
    session.defaultSession.clearStorageData({
      storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
    }).then(() => {
      log.info('Security cache cleared');
    }).catch(error => {
      log.error('Failed to clear security cache:', error);
    });
  }
}