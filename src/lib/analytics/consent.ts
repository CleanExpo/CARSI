/**
 * The rules that decide what carsi.com.au may send to Google Analytics (GP-731), and the one
 * owner of the stored analytics choice.
 *
 * Ported from the Disaster Recovery consent gate (branch fix/ws-ga4-consent-1115a), itself a port
 * of the nrpg.business gate. Pure on purpose: no window, no document, no 'use client', so the
 * browser code, the proof script and the tests all read the same rules. Everything fails closed:
 * a value this file does not recognise is not counted and is not sent.
 *
 *  1. Nothing loads or leaves before the visitor says yes (the stored choice is exactly
 *     `analytics: true` under the current notice version).
 *  2. Only public pages are counted. Signed-in, admin, auth, token and credential pages are not.
 *  3. The address sent is origin + the page's route form (/courses/:slug, never the value in a
 *     [param] segment) + the three campaign keys, each kept only when its value is plain
 *     lower-case words. Every other query key is stripped. The title sent is the route form,
 *     never document.title. These are allow-lists: nothing is sent because it "looks safe".
 *  4. The same rules are applied again to each request at the moment the browser sends it
 *     (`screenCollect`), because the Google library adds data of its own.
 */

import {
  COACHING_CTA_EVENT,
  COURSE_CTA_EVENT,
  EMPLOYER_TRUST_CTA_EVENT,
  MARKETING_PACK_BUILD_EVENT,
  ROLE_GUIDE_START_EVENT,
} from './carsi-events';
import { PUBLIC_ROUTES } from './public-routes';

// ---------------------------------------------------------------------------
// The stored choice
// ---------------------------------------------------------------------------

export const CONSENT_STORAGE_KEY = 'carsi-analytics-consent';

/**
 * The version of the analytics notice the visitor agreed to. A record under any other version is
 * treated as no choice: the banner shows again. Bump it when the analytics wording on /privacy
 * changes in substance.
 */
export const CONSENT_NOTICE_VERSION = '1-2026-11-16';

/** Window event that opens the cookie settings panel. */
export const COOKIE_SETTINGS_EVENT = 'carsi:cookie-settings';
/** Window event fired after the stored choice changes in this tab. */
export const CONSENT_CHANGED_EVENT = 'carsi:consent-changed';

export type AnalyticsChoice = 'granted' | 'denied' | 'unset';

export interface StoredConsent {
  version: string;
  analytics: boolean;
  timestamp: string;
}

interface ReadableStorage {
  getItem(key: string): string | null;
}

interface WritableStorage extends ReadableStorage {
  setItem(key: string, value: string): void;
}

/**
 * The visitor's current choice. 'granted' only for a stored boolean `true` under the current
 * notice version; 'denied' only for a stored boolean `false` under it; everything else (nothing
 * stored, unreadable JSON, storage that throws, an older version) is 'unset'.
 */
export function readAnalyticsChoice(storage: ReadableStorage | null | undefined): AnalyticsChoice {
  if (!storage) return 'unset';
  let raw: string | null;
  try {
    raw = storage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return 'unset';
  }
  if (!raw) return 'unset';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 'unset';
  }
  if (!parsed || typeof parsed !== 'object') return 'unset';
  const record = parsed as Partial<StoredConsent>;
  if (record.version !== CONSENT_NOTICE_VERSION) return 'unset';
  if (record.analytics === true) return 'granted';
  if (record.analytics === false) return 'denied';
  return 'unset';
}

export function writeAnalyticsChoice(
  storage: WritableStorage,
  analytics: boolean,
  now: Date = new Date()
): StoredConsent {
  const record: StoredConsent = {
    version: CONSENT_NOTICE_VERSION,
    analytics,
    timestamp: now.toISOString(),
  };
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  return record;
}

// ---------------------------------------------------------------------------
// Which pages are counted
// ---------------------------------------------------------------------------

/**
 * First path segments that are never counted: signed-in, admin, auth, API, credential, verification,
 * team-invite and unsubscribe pages. Route groups do not appear in a URL, so these are the URL
 * segments of app/(admin), app/(auth), app/(dashboard), app/(coaching-portal) and the private
 * pages under app/(public).
 */
export const PRIVATE_FIRST_SEGMENTS: ReadonlySet<string> = new Set([
  'admin',
  'agents',
  'api',
  'confirm-email',
  'credentials',
  'dashboard',
  'forgot-password',
  'instructor',
  'login',
  'register',
  'reset-password',
  'tasks',
  'teams',
  'unsubscribe',
  'verify',
]);

/** Whole paths (and everything under them) that are never counted. */
export const PRIVATE_PATH_PREFIXES: readonly string[] = ['/events/ccw-roadshow/checkin'];

/**
 * Public pages whose next segment is a record identifier (app/(public)/jobs/[id] and
 * calendar/[id]). The list page itself is counted; a page below it is not, whatever the
 * identifier looks like, because a short id is still an id. consent.test.ts walks app/ and fails
 * when a new identifier route is not covered here or by PRIVATE_FIRST_SEGMENTS.
 */
export const IDENTIFIER_ROUTES: readonly string[] = ['/calendar', '/jobs'];

const MAX_PATH = 200;
const PATH_SHAPE = /^\/[a-z0-9\-_/]*$/;
/** Used only by the wire check on event parameter values; addresses and titles never need it. */
const DIGIT_RUN = /\d{6,}/;

/**
 * A path in its one accepted spelling, or null. Upper case, percent escapes, dots, doubled
 * slashes, semicolons, backslashes, an '@' and a trailing slash (other than the home page) fail
 * closed.
 */
export function normalisePath(pathname: unknown): string | null {
  if (typeof pathname !== 'string' || pathname.length === 0 || pathname.length > MAX_PATH)
    return null;
  if (!PATH_SHAPE.test(pathname)) return null;
  if (pathname.includes('//')) return null;
  if (pathname.length > 1 && pathname.endsWith('/')) return null;
  return pathname;
}

const ROUTE_SEGMENTS = PUBLIC_ROUTES.map((route) =>
  route === '/' ? [] : route.slice(1).split('/')
);

/**
 * The public route a path belongs to, as it is sent: `/courses/[slug]` is sent as
 * `/courses/:slug`. Null when the path matches no public page. A static segment must match exactly;
 * a [param] segment matches any one segment, and its value is never sent.
 */
export function routeOf(pathname: unknown): string | null {
  const path = normalisePath(pathname);
  if (path === null) return null;
  const segments = path === '/' ? [] : path.slice(1).split('/');
  let best: string[] | null = null;
  for (const pattern of ROUTE_SEGMENTS) {
    if (pattern.length !== segments.length) continue;
    if (!pattern.every((part, i) => part.startsWith('[') || part === segments[i])) continue;
    // Prefer the pattern with the most static segments (/jobs/submit over /jobs/[id]).
    const statics = pattern.filter((part) => !part.startsWith('[')).length;
    if (best === null || statics > best.filter((part) => !part.startsWith('[')).length)
      best = pattern;
  }
  if (best === null) return null;
  return `/${best.map((part) => (part.startsWith('[') ? `:${part.slice(1, -1)}` : part)).join('/')}`;
}

/** Every route form that may be sent (for example /courses/:slug), for the wire check. */
const SENT_ROUTES: ReadonlySet<string> = new Set(
  PUBLIC_ROUTES.map((route) => route.replace(/\[[^\]]+\]/g, 'x'))
    .filter((path) => isCountedPath(path))
    .map((path) => routeOf(path))
    .filter((route): route is string => route !== null)
);

export function isCountedPath(pathname: unknown): boolean {
  const path = normalisePath(pathname);
  if (path === null) return false;
  const segments = path.slice(1).split('/');
  if (PRIVATE_FIRST_SEGMENTS.has(segments[0])) return false;
  if (PRIVATE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)))
    return false;
  if (IDENTIFIER_ROUTES.some((route) => path.startsWith(`${route}/`))) return false;
  return routeOf(path) !== null;
}

// ---------------------------------------------------------------------------
// The address, referrer and title that are sent
// ---------------------------------------------------------------------------

/**
 * The campaign keys that survive. utm_term and utm_content are free text and can carry a name or a
 * phone number, so they are stripped with every other key.
 */
export const KEPT_QUERY_KEYS: readonly string[] = ['utm_source', 'utm_medium', 'utm_campaign'];
/**
 * A campaign value is kept only when it is plain lower-case words: letters, hyphens and
 * underscores, no digits, no spaces. Anything else is dropped, not cleaned: this is an allow-list,
 * so no shape of personal data (a phone number with separators, a name, an email) can pass.
 */
const CAMPAIGN_VALUE = /^[a-z_-]{1,64}$/;
const ORIGIN_SHAPE = /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/;

function keptQuery(search: unknown): string {
  if (typeof search !== 'string' || search === '' || search === '?') return '';
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return '';
  }
  const kept = KEPT_QUERY_KEYS.flatMap((key) => {
    const values = params.getAll(key);
    if (values.length !== 1 || !CAMPAIGN_VALUE.test(values[0])) return [];
    return [`${key}=${values[0]}`];
  });
  return kept.length > 0 ? `?${kept.join('&')}` : '';
}

/**
 * The address sent for a counted page: origin, the route it belongs to (never the values in its
 * [param] segments) and the plain campaign keys. Empty when the page is not counted or the origin
 * is not a plain web origin. An address already in its sent form is returned as it is.
 */
export function safeLocation(origin: unknown, pathname: unknown, search: unknown): string {
  if (typeof origin !== 'string' || !ORIGIN_SHAPE.test(origin)) return '';
  if (typeof pathname === 'string' && SENT_ROUTES.has(pathname))
    return `${origin}${pathname}${keptQuery(search)}`;
  if (!isCountedPath(pathname)) return '';
  return `${origin}${routeOf(pathname)}${keptQuery(search)}`;
}

/** The same rule for a whole address. Empty when it is not on `origin` or not counted. */
export function safeLocationOf(address: unknown, origin: unknown): string {
  if (typeof address !== 'string' || typeof origin !== 'string') return '';
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return '';
  }
  if (url.origin !== origin) return '';
  return safeLocation(origin, url.pathname, url.search);
}

/** The route form of a page on this site, or '' (for PostHog's $pathname). */
export function safePathname(pathname: unknown): string {
  if (typeof pathname === 'string' && SENT_ROUTES.has(pathname)) return pathname;
  return isCountedPath(pathname) ? (routeOf(pathname) ?? '') : '';
}

/**
 * The referrer sent. This site: origin and route of a counted page, otherwise empty. Another site:
 * its origin only. Anything that cannot be read: empty.
 */
export function safeReferrer(referrer: unknown, origin: unknown): string {
  if (typeof referrer !== 'string' || referrer === '' || typeof origin !== 'string') return '';
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return '';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
  if (url.origin === origin) {
    const route = safePathname(url.pathname);
    return route ? `${origin}${route}` : '';
  }
  return url.origin;
}

/** The title sent when there is no page: the site name. */
export const SITE_TITLE = 'CARSI';

/**
 * True when a page title may be sent: only the site name or a route form. The document title is
 * never sent, because a page can write anything into it.
 */
export function isSafeTitle(title: unknown): title is string {
  return title === SITE_TITLE || (typeof title === 'string' && SENT_ROUTES.has(title));
}

/** The title sent for a page: its route form (for example /courses/:slug), or the site name. */
export function safeTitle(pathname: unknown): string {
  return safePathname(pathname) || SITE_TITLE;
}

// ---------------------------------------------------------------------------
// Which events and parameters may leave the page
// ---------------------------------------------------------------------------

export const ALLOWED_EVENTS: ReadonlySet<string> = new Set([
  'page_view',
  'course_view',
  'enrol_click',
  'checkout_started',
  'membership_view',
  'membership_checkout_started',
  COURSE_CTA_EVENT,
  COACHING_CTA_EVENT,
  ROLE_GUIDE_START_EVENT,
  MARKETING_PACK_BUILD_EVENT,
  EMPLOYER_TRUST_CTA_EVENT,
]);

/** Event parameters with text values (`ep.` on the wire). */
export const ALLOWED_TEXT_PARAMS: ReadonlySet<string> = new Set([
  'course_slug',
  'course_title',
  'purchase_mode',
  'is_free',
  'checkout_enabled',
  'currency',
  /** Phase 5 product CTAs — set only via data-carsi-context / counted paths. */
  'carsi_context',
  'link_path',
]);

/** Event parameters with number values (`epn.` on the wire). */
export const ALLOWED_NUMBER_PARAMS: ReadonlySet<string> = new Set(['value']);

/** A Google Analytics 4 measurement id, in the only shape this site accepts. */
export function isMeasurementId(id: unknown): id is string {
  return typeof id === 'string' && /^G-[A-Z0-9]{4,20}$/.test(id);
}

// ---------------------------------------------------------------------------
// The wire: what a request to Google may contain at the moment it is made
// ---------------------------------------------------------------------------

const COLLECTION_HOSTS: readonly string[] = [
  'google-analytics.com',
  'analytics.google.com',
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
];
const TAG_HOST = 'googletagmanager.com';
const GOOGLE_SITE_HOST = /^(?:[a-z0-9-]+\.)?google\.(?:com|[a-z]{2,3}|com?\.[a-z]{2})$/;
const GOOGLE_SITE_COLLECTION_PATH = /\/collect\/?$|\/ga-audiences|\/pagead\/|\/ccm\//;

function plainHost(host: string): string {
  const lower = host.toLowerCase();
  return lower.endsWith('.') ? lower.slice(0, -1) : lower;
}

function hostIs(host: string, name: string): boolean {
  const plain = plainHost(host);
  return plain === name || plain.endsWith(`.${name}`);
}

function webUrl(url: unknown, base?: string): URL | null {
  if (typeof url !== 'string' || url === '') return null;
  let parsed: URL;
  try {
    parsed = base === undefined ? new URL(url) : new URL(url, base);
  } catch {
    return null;
  }
  return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
}

/** The address of the Google library for this measurement id. Empty for an invalid id. */
export function libraryUrl(measurementId: string): string {
  return isMeasurementId(measurementId)
    ? `https://www.${TAG_HOST}/gtag/js?id=${encodeURIComponent(measurementId)}`
    : '';
}

/** True for any address on a Google Analytics or Tag Manager host, whatever the path. */
export function isGoogleAnalyticsHostUrl(url: unknown, base?: string): boolean {
  const parsed = webUrl(url, base);
  if (parsed === null) return false;
  const host = parsed.hostname;
  return hostIs(host, TAG_HOST) || COLLECTION_HOSTS.some((name) => hostIs(host, name));
}

/** True for an address that would hand data to Google's collection services. Never throws. */
export function isCollectionUrl(url: unknown, base?: string): boolean {
  const parsed = webUrl(url, base);
  if (parsed === null) return false;
  const host = parsed.hostname;
  if (COLLECTION_HOSTS.some((name) => hostIs(host, name))) return true;
  if (hostIs(host, TAG_HOST)) return !parsed.pathname.startsWith('/gtag/');
  if (GOOGLE_SITE_HOST.test(plainHost(host)))
    return GOOGLE_SITE_COLLECTION_PATH.test(parsed.pathname);
  return false;
}

export interface WireContext {
  origin: string;
  measurementId: string;
  choice: AnalyticsChoice;
}

export interface ScreenedRequest {
  url: string;
  body: string | undefined;
}

const NUMBER_VALUE = /^-?\d{1,15}(\.\d{1,10})?$/;
const RULED_FIELDS: ReadonlySet<string> = new Set(['tid', 'en', 'dl', 'dr', 'dt', 'dp']);
const PERCENT_ESCAPES = /%[0-9A-Fa-f]{2}/g;

/** Every reading of a value: as given, then with percent escapes undone, up to four rounds. */
function everyReading(value: string): string[] | null {
  const readings = [value];
  let current = value;
  for (let round = 0; round < 4; round += 1) {
    const next = current.replace(PERCENT_ESCAPES, (escape) =>
      String.fromCharCode(parseInt(escape.slice(1), 16))
    );
    if (next === current) return readings;
    readings.push(next);
    current = next;
  }
  return /%[0-9A-Fa-f]{2}/.test(current) ? null : readings;
}

function looksPersonal(value: string): boolean {
  const readings = everyReading(value);
  return (
    readings === null ||
    readings.some((reading) => reading.includes('@') || reading.includes('://'))
  );
}

/** The fields of one query string, or null when a field is given twice. */
function wireFields(query: string): Map<string, string> | null {
  const fields = new Map<string, string>();
  for (const [key, value] of new URLSearchParams(query)) {
    if (fields.has(key)) return null;
    fields.set(key, value);
  }
  return fields;
}

function cleanReferrer(value: string, context: WireContext): boolean {
  return value === '' || safeReferrer(value, context.origin) === value;
}

/** Parameters with a fixed set of values: anything else is not sent. */
const FIXED_PARAM_VALUES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['purchase_mode', new Set(['self', 'team'])],
  ['currency', new Set(['AUD'])],
  ['is_free', new Set(['true', 'false', '1', '0'])],
  ['checkout_enabled', new Set(['true', 'false', '1', '0'])],
]);
const SLUG_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Product-excellence contexts: hub, coaching-marketing, role-guide:slug, role-guide:slug:start-N. */
const CARSi_CONTEXT_VALUE =
  /^(?:hub(?::[a-z0-9-]+){0,2}|coaching-marketing|role-guide:[a-z0-9-]+(?::(?:start-[1-3]|employer-[1-9]))?)$/;

/**
 * True when an event parameter may be sent, for Google Analytics and PostHog alike. Fixed
 * parameters must hold one of their listed values. course_slug and course_title are read from
 * the course record the page loaded (CourseViewTracker, EnrolButton, GuestEnrolForm), never from
 * the address or a form, so they are catalogue text; they are still refused when they carry an
 * address, an email or a long number.
 */
export function isAllowedTextParam(name: string, value: unknown): boolean {
  if (typeof value === 'number') return ALLOWED_NUMBER_PARAMS.has(name) && Number.isFinite(value);
  if (typeof value === 'boolean') value = String(value);
  if (typeof value !== 'string' || !ALLOWED_TEXT_PARAMS.has(name)) return false;
  const fixed = FIXED_PARAM_VALUES.get(name);
  if (fixed !== undefined) return fixed.has(value);
  if (value.length > 200 || looksPersonal(value) || DIGIT_RUN.test(value)) return false;
  if (name === 'carsi_context') return CARSi_CONTEXT_VALUE.test(value);
  if (name === 'link_path') {
    const path = safePathname(value);
    return path !== '' && path === value;
  }
  return name !== 'course_slug' || SLUG_VALUE.test(value);
}

/**
 * The rules for one event as it appears in a request. `complete` is false for the shared part of a
 * batched request: there a field may be missing, but one that is present must still pass.
 */
function eventAllowed(
  fields: Map<string, string>,
  context: WireContext,
  complete: boolean
): boolean {
  const property = fields.get('tid');
  if (property === undefined ? complete : property !== context.measurementId) return false;
  const eventName = fields.get('en');
  if (eventName === undefined ? complete : !ALLOWED_EVENTS.has(eventName)) return false;

  const address = fields.get('dl');
  if (address === undefined) {
    if (complete) return false;
  } else if (safeLocationOf(address, context.origin) !== address) {
    // The address must already be its own clean form: a counted page with no stripped key.
    return false;
  }

  const referrer = fields.get('dr');
  if (referrer !== undefined && !cleanReferrer(referrer, context)) return false;

  const title = fields.get('dt');
  if (title !== undefined && !isSafeTitle(title)) return false;

  const pagePath = fields.get('dp');
  if (pagePath !== undefined && (address === undefined || pagePath !== new URL(address).pathname))
    return false;

  for (const [key, value] of fields) {
    if (RULED_FIELDS.has(key)) continue;
    // A user id or user property is never sent.
    if (key === 'uid' || key.startsWith('up.') || key.startsWith('upn.')) return false;
    if (key.startsWith('ep.')) {
      const name = key.slice(3);
      if (name === 'page_location') {
        if (value !== address) return false;
      } else if (name === 'page_referrer') {
        if (!cleanReferrer(value, context)) return false;
      } else if (name === 'page_title') {
        if (!isSafeTitle(value)) return false;
      } else if (!isAllowedTextParam(name, value)) {
        return false;
      }
      continue;
    }
    if (key.startsWith('epn.')) {
      if (!ALLOWED_NUMBER_PARAMS.has(key.slice(4)) || !NUMBER_VALUE.test(value)) return false;
      continue;
    }
    // Any other field is the library's own bookkeeping. It never needs an address or an email.
    if (looksPersonal(value)) return false;
  }
  return true;
}

/**
 * Screen one request to Google. Returns what may be sent (the request as is, or with the events
 * that broke a rule taken out), or null when nothing in it may leave. Nothing leaves unless the
 * stored choice is 'granted'. A body that is not plain text cannot be read, so it is not sent.
 */
export function screenCollect(
  url: unknown,
  body: unknown,
  context: WireContext
): ScreenedRequest | null {
  if (typeof url !== 'string' || !isCollectionUrl(url)) return null;
  if (!context || context.choice !== 'granted') return null;
  if (typeof context.origin !== 'string' || !ORIGIN_SHAPE.test(context.origin)) return null;
  if (!isMeasurementId(context.measurementId)) return null;
  const shared = wireFields(new URL(url).search);
  if (shared === null) return null;

  if (body === undefined || body === null || body === '') {
    return eventAllowed(shared, context, true) ? { url, body: undefined } : null;
  }
  if (typeof body !== 'string') return null;
  if (!eventAllowed(shared, context, false)) return null;

  const kept: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (line === '') continue;
    const own = wireFields(line);
    if (own === null) continue;
    const event = new Map(shared);
    for (const [key, value] of own) event.set(key, value);
    if (eventAllowed(event, context, true)) kept.push(line);
  }
  if (kept.length === 0) return null;
  return { url, body: kept.join(body.includes('\r\n') ? '\r\n' : '\n') };
}
