import { ALLOWED_DOMAINS, BLOCKED_DOMAINS } from '../constants/urls';

export const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

export const isAllowedDomain = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // Check if domain is explicitly blocked
    if (BLOCKED_DOMAINS.some(blocked => hostname.includes(blocked))) {
      return false;
    }
    
    // Check if domain is in allowed list
    return ALLOWED_DOMAINS.some(allowed => 
      hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    
    // Remove tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref_src', 'ref_url', 's', 'src', 'twclid', 'gclid', 'fbclid'
    ];
    
    trackingParams.forEach(param => {
      parsedUrl.searchParams.delete(param);
    });
    
    return parsedUrl.toString();
  } catch {
    return url;
  }
};

export const validateSettings = (settings: any): boolean => {
  if (!settings || typeof settings !== 'object') {
    return false;
  }
  
  const requiredFields = ['theme', 'autoHideMenuBar', 'enableNotifications'];
  return requiredFields.every(field => field in settings);
};

export const validateWindowState = (state: any): boolean => {
  if (!state || typeof state !== 'object') {
    return false;
  }
  
  const { width, height, x, y } = state;
  
  if (typeof width !== 'number' || typeof height !== 'number') {
    return false;
  }
  
  if (width < 300 || height < 200) {
    return false;
  }
  
  if (x !== undefined && (typeof x !== 'number' || x < -10000 || x > 10000)) {
    return false;
  }
  
  if (y !== undefined && (typeof y !== 'number' || y < -10000 || y > 10000)) {
    return false;
  }
  
  return true;
};

export const escapeHtml = (text: string): string => {
  // Check if we're in a DOM environment using globalThis
  const global = globalThis as any;
  if (global.document && typeof global.document.createElement === 'function') {
    const div = global.document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Fallback for Node.js environment (main process)
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const sanitizeCSS = (css: string): string => {
  // Remove potentially dangerous CSS
  const dangerous = [
    /@import/gi,
    /javascript:/gi,
    /expression\s*\(/gi,
    /behavior\s*:/gi,
    /binding\s*:/gi,
    /-moz-binding/gi
  ];
  
  let sanitized = css;
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized;
};

export const isValidZoomLevel = (zoom: number): boolean => {
  return typeof zoom === 'number' && zoom >= 0.25 && zoom <= 5.0;
};

export const isValidTheme = (theme: string): boolean => {
  return ['light', 'dark', 'system'].includes(theme);
};