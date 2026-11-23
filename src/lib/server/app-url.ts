type OriginRequest = { nextUrl?: { origin: string } };

const PRODUCTION_ORIGIN = 'https://carsi.com.au';
/**
 * CARSI's own public origins, as fixed strings (no port). Both hosts serve the site, so a
 * buyer on www must return to www, where their session cookie lives. Never read from a request.
 */
const CARSI_ORIGINS = new Set([PRODUCTION_ORIGIN, 'https://www.carsi.com.au']);

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    /^127(?:\.\d{1,3}){3}$/.test(host) ||
    host === '[::1]' ||
    host === '[::]'
  );
}

function parseHttpUrl(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Canonical public origin for redirects, email links, Stripe return URLs and credential links.
 * GP-700: this is the only place the site address is decided; never build one from the
 * request's Host or X-Forwarded-Host. The request is read only outside production.
 */
export function getAppOrigin(request?: OriginRequest | null): string {
  for (const value of [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_FRONTEND_URL]) {
    const url = parseHttpUrl(value);
    if (url && (process.env.NODE_ENV !== 'production' || !isLocalHost(url.hostname))) {
      return url.origin;
    }
  }

  const requestUrl = parseHttpUrl(request?.nextUrl?.origin);

  if (process.env.NODE_ENV !== 'production') {
    if (requestUrl && !isLocalHost(requestUrl.hostname)) return requestUrl.origin;
    return 'http://localhost:3000';
  }

  // GP-700: in production the request's Host header is caller-controlled, so the request is
  // never read. A preview deployment uses the address the platform sets.
  if (process.env.VERCEL_ENV === 'preview') {
    const preview =
      parseHttpUrl(
        process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined
      ) ?? parseHttpUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
    if (preview && !isLocalHost(preview.hostname)) return preview.origin;
  }
  return PRODUCTION_ORIGIN;
}

/**
 * Accept a client return URL only on the same origin as `fallback` (which callers build from
 * `getAppOrigin`) or on one of CARSI's own fixed origins. GP-700: in production a return URL
 * on any other site, or on a CARSI host with a port or over http, falls back.
 */
export function getCheckoutReturnUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const url = parseHttpUrl(value);
  if (!url) return fallback;
  if (
    process.env.NODE_ENV === 'production' &&
    url.origin !== parseHttpUrl(fallback)?.origin &&
    !CARSI_ORIGINS.has(url.origin)
  ) {
    return fallback;
  }
  // Preserve Stripe's literal {CHECKOUT_SESSION_ID} placeholder.
  return value.trim();
}
