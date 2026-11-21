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
 *  3. The address sent is origin + path + the three plain campaign keys. Every other query key
 *     (email, token, session id, click id, search text) is stripped.
 *  4. The same rules are applied again to each request at the moment the browser sends it
 *     (`screenCollect`), because the Google library adds data of its own.
 */

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
const DIGIT_RUN = /\d{6,}/;

/**
 * A segment that looks like an identifier rather than a page name: a run of six or more digits,
 * an email-like '@', a long letters-and-digits token with no hyphen (a cuid, uuid or session id),
 * or anything over 80 characters.
 */
function isTokenLikeSegment(segment: string): boolean {
  if (segment.length > 80) return true;
  if (DIGIT_RUN.test(segment)) return true;
  if (segment.length >= 20 && !segment.includes('-') && /\d/.test(segment) && /[a-z]/.test(segment))
    return true;
  // A uuid, with or without its hyphens.
  if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}/.test(segment)) return true;
  return false;
}

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

export function isCountedPath(pathname: unknown): boolean {
  const path = normalisePath(pathname);
  if (path === null) return false;
  if (path === '/') return true;
  const segments = path.slice(1).split('/');
  if (PRIVATE_FIRST_SEGMENTS.has(segments[0])) return false;
  if (PRIVATE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)))
    return false;
  if (IDENTIFIER_ROUTES.some((route) => path.startsWith(`${route}/`))) return false;
  return !segments.some(isTokenLikeSegment);
}

// ---------------------------------------------------------------------------
// The address, referrer and title that are sent
// ---------------------------------------------------------------------------

/**
 * The campaign keys that survive. utm_term and utm_content are free text and can carry a name or a
 * phone number, so they are stripped with every other key.
 */
export const KEPT_QUERY_KEYS: readonly string[] = ['utm_source', 'utm_medium', 'utm_campaign'];
const PLAIN_VALUE = /^[A-Za-z0-9_.~+ -]{1,100}$/;
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
    if (values.length !== 1) return [];
    const value = values[0];
    if (!PLAIN_VALUE.test(value) || DIGIT_RUN.test(value)) return [];
    return [`${key}=${encodeURIComponent(value)}`];
  });
  return kept.length > 0 ? `?${kept.join('&')}` : '';
}

/**
 * The address sent for a counted page: origin and path plus the plain campaign keys. Empty when
 * the page is not counted or the origin is not a plain web origin.
 */
export function safeLocation(origin: unknown, pathname: unknown, search: unknown): string {
  if (typeof origin !== 'string' || !ORIGIN_SHAPE.test(origin)) return '';
  if (!isCountedPath(pathname)) return '';
  return `${origin}${pathname as string}${keptQuery(search)}`;
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

/**
 * The referrer sent. This site: origin and path of a counted page, otherwise empty. Another site:
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
  if (url.origin === origin) return isCountedPath(url.pathname) ? `${origin}${url.pathname}` : '';
  return url.origin;
}

/** True when a page title may be sent: short, and nothing that reads like an email or a number. */
export function isSafeTitle(title: unknown): title is string {
  return (
    typeof title === 'string' &&
    title.length <= 200 &&
    !title.includes('@') &&
    !title.includes('://') &&
    !DIGIT_RUN.test(title)
  );
}

/** The title sent for a counted page: the document title when it is safe, else 'CARSI'. */
export function safeTitle(title: unknown): string {
  return isSafeTitle(title) && title.trim() !== '' ? title : 'CARSI';
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
]);

/** Event parameters with text values (`ep.` on the wire). */
export const ALLOWED_TEXT_PARAMS: ReadonlySet<string> = new Set([
  'course_slug',
  'course_title',
  'purchase_mode',
  'is_free',
  'checkout_enabled',
  'currency',
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
      } else if (!ALLOWED_TEXT_PARAMS.has(name) || looksPersonal(value) || DIGIT_RUN.test(value)) {
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
