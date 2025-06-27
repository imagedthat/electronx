import { BrowserWindow } from 'electron';
import log from 'electron-log';

export interface MessageCount {
  unreadCount: number;
  lastChecked: number;
  success: boolean;
  error?: string;
}

export class MessageCounter {
  private mainBrowserView: any = null; // Reference to main browser view for session
  private backgroundWindow: BrowserWindow | null = null;
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private listeners: ((count: MessageCount) => void)[] = [];
  private lastCount = 0;
  private readonly POLL_INTERVAL = 30000; // 30 seconds
  private readonly CHAT_URL = 'https://x.com/i/chat';

  constructor(browserView: any) {
    this.mainBrowserView = browserView;
  }

  public start(): void {
    if (this.pollInterval) {
      this.stop();
    }

    log.info('Starting message count polling...');
    this.isPolling = true;
    
    // Initial check
    this.checkMessageCount();
    
    // Set up periodic polling
    this.pollInterval = setInterval(() => {
      this.checkMessageCount();
    }, this.POLL_INTERVAL);
  }

  public stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
      log.info('Stopped message count polling');
    }
  }

  public onCountChange(callback: (count: MessageCount) => void): () => void {
    this.listeners.push(callback);
    log.info(`Added message count listener. Total listeners: ${this.listeners.length}`);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
        log.info(`Removed message count listener. Total listeners: ${this.listeners.length}`);
      }
    };
  }

  private async checkMessageCount(): Promise<void> {
    if (!this.mainBrowserView || !this.isPolling) return;

    try {
      log.info('Checking message count...');

      // Create or reuse background window for chat loading
      if (!this.backgroundWindow || this.backgroundWindow.isDestroyed()) {
        await this.createBackgroundWindow();
      }

      if (!this.backgroundWindow) {
        throw new Error('Failed to create background window');
      }

      log.debug('Loading chat page in background window:', this.CHAT_URL);
      
      // Load the chat page
      await this.backgroundWindow.loadURL(this.CHAT_URL);

      // Wait for page to be ready by polling document.readyState
      await new Promise(async (resolve, reject) => {
        const maxAttempts = 60; // 60 seconds total
        let attempts = 0;
        
        const checkReady = async () => {
          attempts++;
          
          try {
            const pageInfo = await this.backgroundWindow!.webContents.executeJavaScript(`
              ({
                url: window.location.href,
                title: document.title,
                bodyLength: document.body ? document.body.innerHTML.length : 0,
                hasAuthElements: document.querySelectorAll('[data-testid*="UserAvatar"]').length,
                readyState: document.readyState,
                isOnChatPage: window.location.href.includes('/i/chat')
              })
            `);
            
            // Page is ready if it's complete and on the chat page with content
            if (pageInfo.readyState === 'complete' && 
                pageInfo.isOnChatPage && 
                pageInfo.bodyLength > 10000) {
              log.info('Chat page loaded successfully:', pageInfo);
              resolve(null);
              return;
            }
            
            // Continue checking if not ready yet
            if (attempts < maxAttempts) {
              setTimeout(checkReady, 1000); // Check every second
            } else {
              log.error('Chat page load timeout after polling. Final state:', pageInfo);
              reject(new Error('Chat page load timeout'));
            }
            
          } catch (error) {
            if (attempts < maxAttempts) {
              setTimeout(checkReady, 1000); // Continue trying
            } else {
              log.error('Chat page load timeout with error:', error);
              reject(new Error('Chat page load timeout'));
            }
          }
        };
        
        // Start checking after initial delay to let navigation begin
        setTimeout(checkReady, 2000);
      });

      log.debug('Chat page loaded, injecting storage data...');

      // No need to inject storage data since we're using the same session
      log.debug('Using shared session, no storage injection needed');

      // Wait for WebSocket connections and dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 8000)); // 8 seconds for WebSocket content

      log.debug('Counting unread message indicators...');

      // Count unread message indicators
      const result = await this.backgroundWindow.webContents.executeJavaScript(`
        (function() {
          try {
            // Look for the specific SVG that indicates unread messages
            const svgSelector = 'svg[xmlns="http://www.w3.org/2000/svg"][viewBox="0 0 24 24"][width="14"][height="14"]';
            const svgs = document.querySelectorAll(svgSelector);
            
            let unreadCount = 0;
            let debugInfo = {
              totalSvgs: svgs.length,
              circlesFound: 0,
              allSvgInfo: [],
              matchingSvgs: [],
              blueElements: 0,
              chatElements: 0
            };
            
            // Look for chat-related elements to confirm content loaded
            const chatElements = document.querySelectorAll('[data-testid*="chat"], [data-testid*="conversation"], [aria-label*="message"]');
            debugInfo.chatElements = chatElements.length;
            
            // Also look for any blue-colored elements that might be unread indicators
            const blueElements = document.querySelectorAll('[class*="blue"], .text-blue-500');
            debugInfo.blueElements = blueElements.length;
            
            for (let svg of svgs) {
              // Check if it has the blue circle (unread indicator)
              const circle = svg.querySelector('circle[cx="12"][cy="12"][r="10.3"]');
              
              if (circle) {
                debugInfo.circlesFound++;
                
                const svgInfo = {
                  classList: Array.from(svg.classList),
                  parentClassList: svg.parentElement ? Array.from(svg.parentElement.classList) : [],
                  hasBlueClass: false,
                  circleAttributes: {
                    fill: circle.getAttribute('fill'),
                    style: circle.getAttribute('style')
                  }
                };
                
                // Check for any blue-related classes on svg or parent
                const hasBlue = svg.classList.toString().includes('blue') || 
                               (svg.parentElement && svg.parentElement.classList.toString().includes('blue'));
                
                if (hasBlue || svg.classList.contains('text-blue-500')) {
                  unreadCount++;
                  svgInfo.hasBlueClass = true;
                  debugInfo.matchingSvgs.push(svgInfo);
                }
                
                // Log first few SVGs with circles for debugging
                if (debugInfo.allSvgInfo.length < 5) {
                  debugInfo.allSvgInfo.push(svgInfo);
                }
              }
            }
            
            return {
              unreadCount: unreadCount,
              debug: debugInfo,
              url: window.location.href,
              timestamp: Date.now(),
              success: true,
              documentReady: document.readyState,
              totalElements: document.querySelectorAll('*').length
            };
          } catch (error) {
            return {
              unreadCount: 0,
              error: error.message,
              url: window.location.href,
              timestamp: Date.now(),
              success: false,
              documentReady: document.readyState
            };
          }
        })();
      `);

      const messageCount: MessageCount = {
        unreadCount: result.unreadCount,
        lastChecked: Date.now(),
        success: result.success,
        error: result.error
      };

      // Log count changes
      if (this.lastCount !== result.unreadCount) {
        log.info('Message count changed:', {
          oldCount: this.lastCount,
          newCount: result.unreadCount,
          debug: result.debug
        });
        this.lastCount = result.unreadCount;
      }

      log.debug('Message count result:', {
        unreadCount: result.unreadCount,
        success: result.success,
        url: result.url,
        documentReady: result.documentReady,
        totalElements: result.totalElements,
        chatElements: result.debug.chatElements,
        debug: result.debug
      });

      // Notify listeners
      this.notifyListeners(messageCount);

    } catch (error) {
      log.error('Failed to check message count:', error);
      
      const errorCount: MessageCount = {
        unreadCount: 0,
        lastChecked: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.notifyListeners(errorCount);
    }
  }

  private async createBackgroundWindow(): Promise<void> {
    try {
      log.debug('Creating background window for chat polling...');
      
      // Use the same session as the main browser view for automatic auth sharing
      const mainSession = this.mainBrowserView.webContents.session;
      
      this.backgroundWindow = new BrowserWindow({
        width: 1366,
        height: 1024,
        show: false, // Keep hidden - this is key for background operation
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          session: mainSession, // CRITICAL: Share the exact same session object
          allowRunningInsecureContent: false,
          experimentalFeatures: false
        }
      });

      // Set identical user agent as main view
      const iPadProUserAgent = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      this.backgroundWindow.webContents.setUserAgent(iPadProUserAgent);

      // Handle window events
      this.backgroundWindow.on('closed', () => {
        this.backgroundWindow = null;
        log.debug('Background window closed');
      });

      this.backgroundWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        log.error('Background window failed to load:', { errorCode, errorDescription, validatedURL });
      });

      // Handle redirects and navigation
      this.backgroundWindow.webContents.on('will-navigate', (event, url) => {
        log.debug('Background window navigating to:', url);
      });

      this.backgroundWindow.webContents.on('did-navigate', (event, url) => {
        log.debug('Background window navigated to:', url);
      });

      log.debug('Background window created with shared session');

    } catch (error) {
      log.error('Failed to create background window:', error);
      this.backgroundWindow = null;
      throw error;
    }
  }


  private notifyListeners(count: MessageCount): void {
    log.info(`Notifying ${this.listeners.length} message count listeners with count:`, count.unreadCount);
    this.listeners.forEach((callback, index) => {
      try {
        log.debug(`Calling listener ${index} with count:`, count.unreadCount);
        callback(count);
      } catch (error) {
        log.error('Error in message count listener:', error);
      }
    });
  }

  public getCurrentCount(): number {
    return this.lastCount;
  }

  public isCurrentlyPolling(): boolean {
    return this.isPolling;
  }

  public async forceCheck(): Promise<MessageCount> {
    return new Promise((resolve) => {
      const unsubscribe = this.onCountChange((count) => {
        unsubscribe();
        resolve(count);
      });
      
      this.checkMessageCount();
    });
  }

  public destroy(): void {
    this.stop();
    
    // Clean up background window
    if (this.backgroundWindow && !this.backgroundWindow.isDestroyed()) {
      this.backgroundWindow.close();
      this.backgroundWindow = null;
    }
    
    this.listeners = [];
    this.mainBrowserView = null;
    log.debug('MessageCounter destroyed');
  }
}