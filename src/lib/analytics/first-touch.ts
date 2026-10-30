/**
 * First-touch attribution (Authority Machine slice 1a).
 *
 * The first time a visitor reaches a CARSI page, the request proxy records where they came
 * from in the `carsi_ft` cookie and never overwrites it. At checkout the route copies it into
 * the Stripe Checkout Session metadata as `ft_ch`, `ft_ref`, `ft_lp` and `ft_at`.
 *
 * Privacy (APP 3/5): nothing taken from a URL is ever stored. Every stored field is a token from
 * a fixed list chosen here: the referrer becomes a source category (`google`, `linkedin`,
 * `other`...) and the landing page becomes a section name (`courses`, `for`, `other`...).
 * Hosts, paths, slugs and query strings can all identify a person (a `jane-smith.notion.site`
 * referrer, a `/for/twelve-queen-street` path), so they are mapped, not cleaned. The cookie is
 * client-held, so a value read back is mapped again and anything off the lists becomes `other`.
 *
 * Pure functions, no DOM and no Next.js imports.
 */

import type { UtmValues } from './utm-cookie';

export const FIRST_TOUCH_COOKIE_NAME = 'carsi_ft';
export const FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

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

/** Every value `ft_ref` can hold. `''` = no referrer; `internal` = our own site. */
export const REFERRER_SOURCES = [
  '',
  'google',
  'bing',
  'duckduckgo',
  'facebook',
  'instagram',
  'linkedin',
  'youtube',
  'x',
  'reddit',
  'chatgpt',
  'perplexity',
  'gemini',
  'copilot',
  'claude',
  'email',
  'internal',
  'other',
] as const;
export type ReferrerSource = (typeof REFERRER_SOURCES)[number];

/** Top-level sections a landing page is recorded under; `home` for `/`, else `other`. */
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
const LANDING_VALUES: readonly string[] = ['home', ...LANDING_SECTIONS, 'other'];

export interface FirstTouch {
  ch: FirstTouchChannel;
  ref: ReferrerSource;
  /** `home`, a name from LANDING_SECTIONS, or `other`. */
  lp: string;
  /** ISO date (YYYY-MM-DD, UTC). */
  at: string;
}

/**
 * Host suffix -> source. Order matters: more specific Google and Microsoft hosts come before
 * the general search entry. A host matches when it equals the suffix or ends with `.suffix`.
 */
const SOURCE_BY_SUFFIX: ReadonlyArray<readonly [string, ReferrerSource]> = [
  ['mail.google.com', 'email'],
  ['outlook.live.com', 'email'],
  ['outlook.office.com', 'email'],
  ['outlook.office365.com', 'email'],
  ['mail.yahoo.com', 'email'],
  ['gemini.google.com', 'gemini'],
  ['bard.google.com', 'gemini'],
  ['copilot.microsoft.com', 'copilot'],
  ['chatgpt.com', 'chatgpt'],
  ['chat.openai.com', 'chatgpt'],
  ['openai.com', 'chatgpt'],
  ['perplexity.ai', 'perplexity'],
  ['claude.ai', 'claude'],
  ['bing.com', 'bing'],
  ['duckduckgo.com', 'duckduckgo'],
  ['facebook.com', 'facebook'],
  ['fb.com', 'facebook'],
  ['instagram.com', 'instagram'],
  ['linkedin.com', 'linkedin'],
  ['lnkd.in', 'linkedin'],
  ['youtube.com', 'youtube'],
  ['youtu.be', 'youtube'],
  ['x.com', 'x'],
  ['twitter.com', 'x'],
  ['t.co', 'x'],
  ['reddit.com', 'reddit'],
];

/** google.com, google.com.au, google.co.nz and their subdomains. */
const GOOGLE_SEARCH = /(^|\.)google\.(com|com\.au|co\.nz|co\.uk|ca|ie)$/;

const CHANNEL_BY_SOURCE: Record<ReferrerSource, FirstTouchChannel> = {
  '': 'direct',
  google: 'organic_search',
  bing: 'organic_search',
  duckduckgo: 'organic_search',
  facebook: 'social',
  instagram: 'social',
  linkedin: 'social',
  youtube: 'social',
  x: 'social',
  reddit: 'social',
  chatgpt: 'ai_assistant',
  perplexity: 'ai_assistant',
  gemini: 'ai_assistant',
  copilot: 'ai_assistant',
  claude: 'ai_assistant',
  email: 'email',
  internal: 'unknown',
  other: 'referral',
};

function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

/** Maps a referrer host to a fixed source token. The host itself is never returned. */
export function referrerSource(host: string, siteHost: string): ReferrerSource {
  const h = (host ?? '').trim().toLowerCase();
  if (!h) return '';
  if (!/^[a-z0-9.-]+$/.test(h)) return 'other';
  if (siteHost && (bareHost(h) === bareHost(siteHost) || bareHost(h).endsWith(`.${bareHost(siteHost)}`))) {
    return 'internal';
  }
  for (const [suffix, source] of SOURCE_BY_SUFFIX) {
    if (h === suffix || h.endsWith(`.${suffix}`)) return source;
  }
  if (GOOGLE_SEARCH.test(h)) return 'google';
  return 'other';
}

/** Maps a URL path to a fixed section name. Slugs and deeper segments are never kept. */
export function landingSection(path: string): string {
  const first = (path ?? '').split(/[?#]/)[0]?.split('/').filter(Boolean)[0];
  if (!first) return 'home';
  return (LANDING_SECTIONS as readonly string[]).includes(first) ? first : 'other';
}

function channelFor(source: ReferrerSource, utm: UtmValues): FirstTouchChannel {
  const medium = (utm.utm_medium ?? '').toLowerCase();
  if (/(^|[_-])(cpc|ppc|paid|display|cpm)([_-]|$)/.test(medium) || medium.startsWith('paid')) return 'paid';
  if (source === '') {
    if (medium === 'email' || medium === 'newsletter') return 'email';
    if (medium === 'social') return 'social';
  }
  return CHANNEL_BY_SOURCE[source];
}

export function classifyChannel(input: { refHost: string; utm: UtmValues; siteHost: string }): FirstTouchChannel {
  return channelFor(referrerSource(input.refHost, input.siteHost), input.utm);
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
  const ref = referrerSource(safeUrl(input.referrer)?.hostname ?? '', input.siteHost);
  if (ref === 'internal') return null;

  const landing = safeUrl(input.landingUrl);
  const utm: UtmValues = {};
  const medium = landing?.searchParams.get('utm_medium');
  if (medium) utm.utm_medium = medium;

  return {
    ch: channelFor(ref, utm),
    ref,
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

/** An allowed source token as-is; anything else (an old raw host) is mapped, never copied. */
function readSource(value: unknown): ReferrerSource {
  if (typeof value !== 'string') return 'other';
  if ((REFERRER_SOURCES as readonly string[]).includes(value)) return value as ReferrerSource;
  return referrerSource(value.split(/[/?#@:\s]/)[0] ?? '', '');
}

/** An allowed section token as-is; an old path is mapped to its section; anything else `other`. */
function readSection(value: unknown): string {
  if (typeof value !== 'string') return 'other';
  if (LANDING_VALUES.includes(value)) return value;
  return value.startsWith('/') ? landingSection(value) : 'other';
}

/** Parses the cookie; anything malformed yields null, never a throw. Fields are re-mapped. */
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
    const ref = readSource(obj.ref);
    // A stored first touch never comes from our own site; treat a planted one as unknown origin.
    return { ch: ch as FirstTouchChannel, ref: ref === 'internal' ? 'other' : ref, lp: readSection(obj.lp), at };
  } catch {
    return null;
  }
}

/** Stripe metadata: four keys, every value a fixed token or an ISO date. */
export function firstTouchMetadata(ft: FirstTouch | null): Record<string, string> {
  if (!ft) return {};
  return {
    ft_ch: ft.ch,
    ...(ft.ref ? { ft_ref: ft.ref } : {}),
    ft_lp: ft.lp,
    ft_at: ft.at,
  };
}
