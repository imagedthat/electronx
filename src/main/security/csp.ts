import { SECURITY_CONFIG } from '../../shared/constants/config';
import { ALLOWED_DOMAINS, BLOCKED_DOMAINS } from '../../shared/constants/urls';

export class CSPManager {
  private static instance: CSPManager;
  private cspHeader: string;

  private constructor() {
    this.cspHeader = this.buildCSPHeader();
  }

  public static getInstance(): CSPManager {
    if (!CSPManager.instance) {
      CSPManager.instance = new CSPManager();
    }
    return CSPManager.instance;
  }

  private buildCSPHeader(): string {
    const allowedDomains = ALLOWED_DOMAINS.join(' https://');
    const blockedDomains = BLOCKED_DOMAINS.map(domain => `'none' ${domain}`).join(' ');

    const directives = {
      'default-src': [
        "'self'",
        `https://${allowedDomains}`,
        'data:',
        'blob:'
      ],
      
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        `https://${allowedDomains}`,
        "'wasm-unsafe-eval'"
      ],
      
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        `https://${allowedDomains}`,
        'data:'
      ],
      
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'http:'
      ],
      
      'media-src': [
        "'self'",
        'blob:',
        'https:',
        'http:',
        `https://${allowedDomains}`
      ],
      
      'font-src': [
        "'self'",
        'data:',
        `https://${allowedDomains}`
      ],
      
      'connect-src': [
        "'self'",
        `https://${allowedDomains}`,
        'wss://x.com',
        'wss://twitter.com',
        'wss://*.x.com',
        'wss://*.twitter.com',
        'https://api.twitter.com'
      ],
      
      'frame-src': [
        "'self'",
        `https://${allowedDomains}`
      ],
      
      'worker-src': [
        "'self'",
        'blob:'
      ],
      
      'child-src': [
        "'self'",
        'blob:'
      ],
      
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': [
        "'self'",
        'https://x.com',
        'https://twitter.com'
      ],
      
      'frame-ancestors': ["'none'"],
      'block-all-mixed-content': [],
      'upgrade-insecure-requests': []
    };

    return Object.entries(directives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');
  }

  public getCSPHeader(): string {
    return this.cspHeader;
  }

  public updateCSPHeader(customDirectives?: Record<string, string[]>): string {
    if (!customDirectives) {
      return this.cspHeader;
    }

    let updatedCSP = this.cspHeader;
    
    Object.entries(customDirectives).forEach(([directive, sources]) => {
      const directivePattern = new RegExp(`${directive}[^;]*`, 'g');
      const newDirective = `${directive} ${sources.join(' ')}`;
      
      if (updatedCSP.includes(directive)) {
        updatedCSP = updatedCSP.replace(directivePattern, newDirective);
      } else {
        updatedCSP += `; ${newDirective}`;
      }
    });

    return updatedCSP;
  }

  public validateCSP(csp: string): boolean {
    const validDirectives = [
      'default-src', 'script-src', 'style-src', 'img-src', 'media-src',
      'font-src', 'connect-src', 'frame-src', 'worker-src', 'child-src',
      'object-src', 'base-uri', 'form-action', 'frame-ancestors',
      'block-all-mixed-content', 'upgrade-insecure-requests'
    ];

    const directives = csp.split(';').map(d => d.trim());
    
    for (const directive of directives) {
      const [name] = directive.split(' ');
      if (name && !validDirectives.includes(name)) {
        return false;
      }
    }

    return true;
  }

  public sanitizeCSP(csp: string): string {
    // Remove potentially dangerous CSP directives
    const dangerousPatterns = [
      /'unsafe-eval'/g,
      /data:/g,
      /\*/g
    ];

    let sanitized = csp;
    dangerousPatterns.forEach(pattern => {
      // Only remove if not in our allowed list
      if (!this.cspHeader.match(pattern)) {
        sanitized = sanitized.replace(pattern, "'none'");
      }
    });

    return sanitized;
  }
}