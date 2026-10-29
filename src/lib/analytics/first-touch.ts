/**
 * First-touch attribution (Authority Machine slice 1a).
 *
 * The first time a visitor reaches a CARSI page, the request proxy records where they came
 * from in the `carsi_ft` cookie and never overwrites it. At checkout the route copies it into
 * the Stripe Checkout Session metadata as `ft_ch`, `ft_ref`, `ft_lp` and `ft_at`.
 *
 * Privacy (APP 3/5): the referrer is kept as a host only. The landing page is reduced to a fixed
 * top-level section, plus a letters-and-hyphens slug for /courses and /for, never an arbitrary
 * path: paths, query strings and fragments can carry personal data (phone numbers, emails). The cookie is client-held, so every read treats it as untrusted.
 *
 * Pure functions, no DOM and no Next.js imports.
 */

import type { UtmValues } from './utm-cookie';

export const FIRST_TOUCH_COOKIE_NAME = 'carsi_ft';
export const FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

const MAX_HOST_LENGTH = 100;
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
  /** Landing section from `landingSection`: `/`, `/<section>`, `/<section>/<slug>` or `other`. */
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

function cleanHost(value: unknown): string {
  if (typeof value !== 'string') return '';
  // A host has no path, query, fragment, credentials or port worth keeping.
  const host = value.toLowerCase().split(/[/?#@:\s]/)[0] ?? '';
  return host.replace(/[^a-z0-9.-]/g, '').slice(0, MAX_HOST_LENGTH);
}

/**
 * Top-level sections a landing page may be recorded under. Anything else is `other`, so an
 * arbitrary path (which could carry a phone number, an email or a token) is never stored.
 */
export const LANDING_SECTIONS = [
  'courses',
  'industries',
  'for',
  'blog',
  'pricing',
  'membership',
  'about',
  'contact',
  'resources',
  'news',
  'designations',
  'pathways',
  'iicrc-cec-courses',
] as const;

/** Sections whose second segment is kept when it is a plain words-and-hyphens slug. */
const SLUGGED_SECTIONS = new Set(['courses', 'for']);
const SAFE_SLUG = /^[a-z]+(-[a-z]+)*$/;
const MAX_SLUG_LENGTH = 80;

/**
 * Reduces a URL path to what may be stored: `/` (home), `/<section>`, `/courses/<slug>` or
 * `/for/<slug>` when the slug is letters and hyphens only (no digits) and at most 80 characters,
 * otherwise `other`. Query and fragment are always dropped.
 */
export function landingSection(path: string): string {
  const clean = (path.split(/[?#]/)[0] ?? '').trim();
  const segments = clean.split('/').filter(Boolean);
  if (segments.length === 0) return '/';
  const section = segments[0];
  if (!(LANDING_SECTIONS as readonly string[]).includes(section)) return 'other';
  const slug = segments[1];
  if (
    slug &&
    SLUGGED_SECTIONS.has(section) &&
    slug.length <= MAX_SLUG_LENGTH &&
    SAFE_SLUG.test(slug)
  ) {
    return `/${section}/${slug}`;
  }
  return `/${section}`;
}

function storedLanding(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value === 'other') return 'other';
  if (!value.startsWith('/')) return null;
  return landingSection(value);
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
    lp: landingSection(landing?.pathname ?? ''),
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
    const lp = storedLanding(obj.lp);
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
