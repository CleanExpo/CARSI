type OriginRequest = { nextUrl?: { origin: string } };

const PRODUCTION_ORIGIN = 'https://carsi.com.au';
/** CARSI's own production hosts: the only hosts read from a request in production. */
const TRUSTED_HOSTS = new Set(['carsi.com.au', 'www.carsi.com.au']);

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

/** Canonical public origin for redirects and email links, with env taking precedence. */
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

  // GP-700: in production the request's Host header is caller-controlled, so a forged host must
  // never reach an email link or redirect. Only CARSI's own hosts are taken from the request; a
  // preview deployment uses the address the platform sets, never the request.
  if (requestUrl && requestUrl.protocol === 'https:' && TRUSTED_HOSTS.has(requestUrl.hostname)) {
    return requestUrl.origin;
  }
  if (process.env.VERCEL_ENV === 'preview') {
    const preview =
      parseHttpUrl(
        process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined
      ) ?? parseHttpUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
    if (preview && !isLocalHost(preview.hostname)) return preview.origin;
  }
  return PRODUCTION_ORIGIN;
}

/** Preserve public client return URLs, but never accept a local destination in production. */
export function getCheckoutReturnUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const url = parseHttpUrl(value);
  if (!url || (process.env.NODE_ENV === 'production' && isLocalHost(url.hostname))) {
    return fallback;
  }
  // Preserve Stripe's literal {CHECKOUT_SESSION_ID} placeholder.
  return value.trim();
}
