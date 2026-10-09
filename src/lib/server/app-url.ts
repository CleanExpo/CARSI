type OriginRequest = { nextUrl?: { origin: string } };

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
  if (requestUrl && !isLocalHost(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  return process.env.NODE_ENV === 'production' ? 'https://carsi.com.au' : 'http://localhost:3000';
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
