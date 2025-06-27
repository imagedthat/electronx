export const X_URLS = {
  BASE: 'https://x.com',
  HOME: 'https://x.com/home',
  NOTIFICATIONS: 'https://x.com/notifications',
  MESSAGES: 'https://x.com/messages',
  BOOKMARKS: 'https://x.com/i/bookmarks',
  PROFILE: 'https://x.com/settings/profile',
  SETTINGS: 'https://x.com/settings',
  LISTS: 'https://x.com/i/lists',
  COMMUNITIES: 'https://x.com/i/communities',
  PREMIUM: 'https://x.com/i/premium_sign_up',
  EXPLORE: 'https://x.com/explore',
  COMPOSE: 'https://x.com/compose/tweet'
} as const;

export const TWITTER_URLS = {
  BASE: 'https://twitter.com',
  HOME: 'https://twitter.com/home',
  NOTIFICATIONS: 'https://twitter.com/notifications',
  MESSAGES: 'https://twitter.com/messages',
  BOOKMARKS: 'https://twitter.com/i/bookmarks',
  PROFILE: 'https://twitter.com/settings/profile',
  SETTINGS: 'https://twitter.com/settings',
  LISTS: 'https://twitter.com/i/lists',
  COMMUNITIES: 'https://twitter.com/i/communities',
  PREMIUM: 'https://twitter.com/i/premium_sign_up',
  EXPLORE: 'https://twitter.com/explore',
  COMPOSE: 'https://twitter.com/compose/tweet'
} as const;

export const ALLOWED_DOMAINS = [
  'x.com',
  'twitter.com',
  'abs.twimg.com',
  'pbs.twimg.com',
  'video.twimg.com',
  't.co',
  'api.twitter.com',
  'upload.twitter.com',
  'ton.twitter.com',
  'syndication.twitter.com'
] as const;

export const BLOCKED_DOMAINS = [
  'ads.twitter.com',
  'analytics.twitter.com',
  'scribe.twitter.com',
  'telemetry.twitter.com'
] as const;

export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const DEFAULT_URL = X_URLS.HOME;