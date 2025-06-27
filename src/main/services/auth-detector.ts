import { BrowserView } from 'electron';
import log from 'electron-log';

export interface AuthState {
  isAuthenticated: boolean;
  lastChecked: number;
}

export class AuthDetector {
  private browserView: BrowserView | null = null;
  private isAuthenticated = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: ((authState: AuthState) => void)[] = [];
  private readonly CHECK_INTERVAL = 5000; // 5 seconds

  constructor(browserView: BrowserView) {
    this.browserView = browserView;
  }

  public start(): void {
    if (this.checkInterval) {
      this.stop();
    }

    log.info('Starting authentication detection...');
    
    // Initial check
    this.checkAuthentication();
    
    // Set up periodic checking
    this.checkInterval = setInterval(() => {
      this.checkAuthentication();
    }, this.CHECK_INTERVAL);
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      log.info('Stopped authentication detection');
    }
  }

  public onAuthStateChange(callback: (authState: AuthState) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private async checkAuthentication(): Promise<void> {
    if (!this.browserView) return;

    try {
      // Execute script to check for "Log out @username" text in span elements
      const result = await this.browserView.webContents.executeJavaScript(`
        (function() {
          try {
            let found = false;
            let debugInfo = {
              spanCount: 0,
              exactMatches: [],
              allSpanTexts: []
            };
            
            // Look for UserAvatar-Container with dynamic username
            const userAvatarContainers = document.querySelectorAll('[data-testid^="UserAvatar-Container-"]');
            debugInfo.userAvatarContainers = userAvatarContainers.length;
            
            if (userAvatarContainers.length > 0) {
              found = true;
              for (let container of userAvatarContainers) {
                const testId = container.getAttribute('data-testid');
                if (testId && testId.startsWith('UserAvatar-Container-')) {
                  const username = testId.replace('UserAvatar-Container-', '');
                  debugInfo.exactMatches.push({
                    testId: testId,
                    username: username,
                    classList: Array.from(container.classList || [])
                  });
                }
              }
            }
            
            // Also check spans for backup (keep for debugging)
            const allSpans = document.querySelectorAll('span');
            debugInfo.spanCount = allSpans.length;
            
            for (let span of allSpans) {
              const text = span.textContent || span.innerText || '';
              const trimmedText = text.trim();
              
              // Log all span texts for debugging (first 5 spans)
              if (debugInfo.allSpanTexts.length < 5 && trimmedText.length > 0) {
                debugInfo.allSpanTexts.push(trimmedText);
              }
            }
            
            return {
              authenticated: found,
              timestamp: Date.now(),
              url: window.location.href,
              debug: debugInfo,
              documentReady: document.readyState
            };
          } catch (error) {
            return {
              authenticated: false,
              timestamp: Date.now(),
              error: error.message,
              url: window.location.href,
              documentReady: document.readyState
            };
          }
        })();
      `);

      const wasAuthenticated = this.isAuthenticated;
      this.isAuthenticated = result.authenticated;

      // Log authentication state changes
      if (wasAuthenticated !== this.isAuthenticated) {
        log.info('Authentication state changed:', {
          wasAuthenticated,
          isAuthenticated: this.isAuthenticated,
          url: result.url
        });

        // Notify listeners
        this.notifyListeners();
      }

      // Always log debug info for troubleshooting
      log.debug('Auth check result:', {
        authenticated: result.authenticated,
        url: result.url
      });

      // Don't log avatar details for privacy

    } catch (error) {
      log.error('Failed to check authentication:', error);
    }
  }

  private notifyListeners(): void {
    const authState: AuthState = {
      isAuthenticated: this.isAuthenticated,
      lastChecked: Date.now()
    };

    this.listeners.forEach(callback => {
      try {
        callback(authState);
      } catch (error) {
        log.error('Error in auth state listener:', error);
      }
    });
  }

  public getCurrentState(): AuthState {
    return {
      isAuthenticated: this.isAuthenticated,
      lastChecked: Date.now()
    };
  }

  public isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  public async inspectCurrentDOM(): Promise<any> {
    if (!this.browserView) return null;

    try {
      const result = await this.browserView.webContents.executeJavaScript(`
        (function() {
          try {
            let inspection = {
              url: window.location.href,
              title: document.title,
              allSpansWithText: [],
              visibleElements: [],
              documentText: '',
              menuElements: [],
              profileElements: []
            };

            // Get all text content
            inspection.documentText = document.body ? (document.body.innerText || '').substring(0, 500) : '';

            // Find all spans with any text content
            const allSpans = document.querySelectorAll('span');
            for (let span of allSpans) {
              const text = span.textContent || span.innerText || '';
              if (text.trim().length > 0 && text.trim().length < 100) {
                inspection.allSpansWithText.push({
                  text: text.trim(),
                  classList: Array.from(span.classList || []),
                  isVisible: span.offsetParent !== null && !span.hidden,
                  parentTag: span.parentElement ? span.parentElement.tagName : null
                });
              }
            }

            // Look for elements that might be profile/menu related
            const menuSelectors = [
              '[aria-label*="Account menu"]',
              '[aria-label*="Profile"]', 
              '[aria-label*="User menu"]',
              '[data-testid*="UserAvatar"]',
              '[data-testid*="SideNav_AccountSwitcher"]',
              '[role="button"]',
              'button',
              'a[href*="logout"]',
              'a[href*="signout"]'
            ];

            for (let selector of menuSelectors) {
              try {
                const elements = document.querySelectorAll(selector);
                for (let el of elements) {
                  const text = el.textContent || el.innerText || '';
                  if (text.trim().length > 0) {
                    inspection.menuElements.push({
                      selector: selector,
                      text: text.trim().substring(0, 50),
                      tag: el.tagName,
                      classList: Array.from(el.classList || []),
                      ariaLabel: el.getAttribute('aria-label'),
                      testId: el.getAttribute('data-testid')
                    });
                  }
                }
              } catch (e) {
                // Skip invalid selectors
              }
            }

            // Look for elements containing common profile indicators
            const profileIndicators = ['@', 'profile', 'account', 'settings', 'log out', 'sign out'];
            const allElements = document.querySelectorAll('span, div, button, a');
            
            for (let el of allElements) {
              const text = (el.textContent || el.innerText || '').toLowerCase();
              for (let indicator of profileIndicators) {
                if (text.includes(indicator) && text.length < 100) {
                  inspection.profileElements.push({
                    indicator: indicator,
                    text: (el.textContent || el.innerText || '').trim(),
                    tag: el.tagName,
                    classList: Array.from(el.classList || []),
                    isVisible: el.offsetParent !== null && !el.hidden
                  });
                  break;
                }
              }
            }

            return inspection;
          } catch (error) {
            return {
              error: error.message,
              url: window.location.href
            };
          }
        })();
      `);

      return result;
    } catch (error) {
      log.error('Failed to inspect DOM:', error);
      return null;
    }
  }

  public destroy(): void {
    this.stop();
    this.listeners = [];
    this.browserView = null;
    log.debug('AuthDetector destroyed');
  }
}