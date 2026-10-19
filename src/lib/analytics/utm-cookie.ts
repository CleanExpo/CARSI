/**
 * First-party UTM cookie. `UtmCapture` writes the landing page's utm_* params here, and the
 * course checkout route copies them into the Stripe Checkout Session metadata, so every paid
 * enrolment records the campaign that brought the buyer. Last touch wins.
 *
 * The cookie is client-written, so the server treats it as untrusted: only the five utm keys
 * survive, and each value is cut to a short, metadata-safe character set.
 */

export const UTM_COOKIE_NAME = 'carsi_utm';
export const UTM_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmValues = Partial<Record<UtmKey, string>>;

const MAX_VALUE_LENGTH = 100;

function cleanValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/[^A-Za-z0-9 ._\-+:/]/g, '')
    .trim()
    .slice(0, MAX_VALUE_LENGTH);
  return cleaned || null;
}

/** Keeps only the five utm keys with cleaned, non-empty values. */
export function pickUtmValues(input: Record<string, unknown>): UtmValues {
  const out: UtmValues = {};
  for (const key of UTM_KEYS) {
    const value = cleanValue(input[key]);
    if (value) out[key] = value;
  }
  return out;
}

/** Cookie value for a set of utm values. */
export function serializeUtmCookie(values: UtmValues): string {
  return encodeURIComponent(JSON.stringify(values));
}

/**
 * The `document.cookie` assignment for a set of captured params, or null when no utm value
 * survives cleaning — so a junk-only URL never overwrites a good campaign already stored.
 */
export function utmCookieHeader(captured: Record<string, unknown>, secure: boolean): string | null {
  const values = pickUtmValues(captured);
  if (Object.keys(values).length === 0) return null;
  return `${UTM_COOKIE_NAME}=${serializeUtmCookie(values)}; Max-Age=${UTM_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
}

/** Parses the cookie value; anything malformed yields an empty object, never a throw. */
export function parseUtmCookie(raw: string | null | undefined): UtmValues {
  if (!raw) return {};
  try {
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      // Already decoded by the cookie store.
    }
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return pickUtmValues(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}
