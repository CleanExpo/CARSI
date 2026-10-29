/**
 * First-touch attribution (Authority Machine slice 1a).
 *
 * The first time a visitor reaches a CARSI page, the request proxy records where they came
 * from in the `carsi_ft` cookie and never overwrites it. At checkout the route copies it into
 * the Stripe Checkout Session metadata as `ft_ch`, `ft_ref`, `ft_lp` and `ft_at`.
 *
 * Privacy (APP 3/5): the referrer is kept as a host only and the landing page as a path only.
 * Query strings and fragments are dropped because they can carry personal data (search terms,
 * emails in links). The cookie is client-held, so every read treats it as untrusted.
 *
 * Pure functions, no DOM and no Next.js imports.
 */

import type { UtmValues } from './utm-cookie';

export const FIRST_TOUCH_COOKIE_NAME = 'carsi_ft';
export const FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

const MAX_HOST_LENGTH = 100;
const MAX_PATH_LENGTH = 200;
const MAX_RAW_COOKIE_LENGTH = 2048;

export const FIRST_TOUCH_CHANNELS = [
  'direct',
  'organic_search',
  'ai_assistant',
  'social',
  'email',
  'referral',
  'paid',
  'unknown',
] as const;

export type FirstTouchChannel = (typeof FIRST_TOUCH_CHANNELS)[number];

export interface FirstTouch {
  /** Channel. */
  ch: FirstTouchChannel;
  /** Referrer host, '' for none. */
  ref: string;
  /** Landing path, no query or fragment. */
  lp: string;
  /** ISO date (YYYY-MM-DD, UTC). */
  at: string;
}

const AI_ASSISTANT_HOSTS = [
  'chatgpt.com',
  'chat.openai.com',
  'perplexity.ai',
  'gemini.google.com',
  'bard.google.com',
  'copilot.microsoft.com',
  'claude.ai',
  'you.com',
  'poe.com',
];
const EMAIL_HOSTS = ['mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'mail.yahoo.com'];
const SOCIAL_HOSTS = [
  'linkedin.com',
  'lnkd.in',
  'facebook.com',
  'fb.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
  'x.com',
  't.co',
  'twitter.com',
  'tiktok.com',
  'reddit.com',
  'pinterest.com',
];
const SEARCH_HOSTS = ['bing.com', 'duckduckgo.com', 'search.yahoo.com', 'yahoo.com', 'ecosia.org', 'baidu.com', 'yandex.com'];

/** True when `host` is `domain` or a subdomain of it. */
function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function isGoogleSearchHost(host: string): boolean {
  // google.com, www.google.com.au, google.co.nz ... but not gemini/mail (checked first).
  return /(^|\.)google\.[a-z.]{2,10}$/.test(host);
}

function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

function isOwnHost(host: string, siteHost: string): boolean {
  if (!host || !siteHost) return false;
  return bareHost(host) === bareHost(siteHost);
}

/** Same character allowlist as `cleanValue` in utm-cookie.ts, bounded. */
function cleanToken(value: string, max: number): string {
  return value
    .replace(/[^A-Za-z0-9 ._\-+:/]/g, '')
    .trim()
    .slice(0, max);
}

function cleanHost(value: unknown): string {
  if (typeof value !== 'string') return '';
  // A host has no path, query, fragment, credentials or port worth keeping.
  const host = value.toLowerCase().split(/[/?#@:\s]/)[0] ?? '';
  return host.replace(/[^a-z0-9.-]/g, '').slice(0, MAX_HOST_LENGTH);
}

function cleanPath(value: unknown): string {
  if (typeof value !== 'string') return '';
  const path = value.split(/[?#]/)[0] ?? '';
  if (!path.startsWith('/')) return '';
  return cleanToken(path, MAX_PATH_LENGTH);
}

export function classifyChannel(input: {
  refHost: string;
  utm: UtmValues;
  siteHost: string;
}): FirstTouchChannel {
  const medium = (input.utm.utm_medium ?? '').toLowerCase();
  if (/(^|[_-])(cpc|ppc|paid|display|cpm)([_-]|$)/.test(medium) || medium.startsWith('paid')) return 'paid';

  const host = (input.refHost ?? '').toLowerCase();
  if (host && isOwnHost(host, input.siteHost)) return 'unknown';

  if (!host) {
    if (medium === 'email' || medium === 'newsletter') return 'email';
    if (medium === 'social') return 'social';
    return 'direct';
  }

  if (AI_ASSISTANT_HOSTS.some((d) => hostIs(host, d))) return 'ai_assistant';
  if (EMAIL_HOSTS.some((d) => hostIs(host, d))) return 'email';
  if (SOCIAL_HOSTS.some((d) => hostIs(host, d))) return 'social';
  if (isGoogleSearchHost(host) || SEARCH_HOSTS.some((d) => hostIs(host, d))) return 'organic_search';
  return 'referral';
}

function safeUrl(raw: string): URL | null {
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/**
 * The first touch for a page view, or null when the view came from our own site (an internal
 * navigation is not a source and must not start a first touch).
 */
export function buildFirstTouch(input: {
  referrer: string;
  landingUrl: string;
  now: Date;
  siteHost: string;
}): FirstTouch | null {
  const refUrl = safeUrl(input.referrer);
  const refHost = cleanHost(refUrl?.hostname ?? '');
  if (refHost && isOwnHost(refHost, input.siteHost)) return null;

  const landing = safeUrl(input.landingUrl);
  const utm: UtmValues = {};
  const medium = landing?.searchParams.get('utm_medium');
  if (medium) utm.utm_medium = medium;

  return {
    ch: classifyChannel({ refHost, utm, siteHost: input.siteHost }),
    ref: refHost,
    lp: cleanPath(landing?.pathname ?? '') || '/',
    at: input.now.toISOString().slice(0, 10),
  };
}

export function serializeFirstTouchCookie(ft: FirstTouch): string {
  return encodeURIComponent(JSON.stringify(ft));
}

/** The `Set-Cookie` / `document.cookie` value for a first touch. */
export function firstTouchCookieHeader(ft: FirstTouch, secure: boolean): string {
  return `${FIRST_TOUCH_COOKIE_NAME}=${serializeFirstTouchCookie(ft)}; Max-Age=${FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
}

/** Parses the cookie; anything malformed yields null, never a throw. Values are re-cleaned. */
export function parseFirstTouchCookie(raw: string | null | undefined): FirstTouch | null {
  if (!raw || raw.length > MAX_RAW_COOKIE_LENGTH) return null;
  try {
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      // Already decoded by the cookie store.
    }
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;
    const ch = obj.ch;
    if (typeof ch !== 'string' || !(FIRST_TOUCH_CHANNELS as readonly string[]).includes(ch)) return null;
    const at = obj.at;
    if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(at)) return null;
    const lp = cleanPath(obj.lp);
    if (!lp) return null;
    return { ch: ch as FirstTouchChannel, ref: cleanHost(obj.ref), lp, at };
  } catch {
    return null;
  }
}

/** Stripe-safe metadata keys (all keys <= 40 chars, all values <= 200 chars). */
export function firstTouchMetadata(ft: FirstTouch | null): Record<string, string> {
  if (!ft) return {};
  return {
    ft_ch: ft.ch,
    ...(ft.ref ? { ft_ref: ft.ref } : {}),
    ft_lp: ft.lp,
    ft_at: ft.at,
  };
}
