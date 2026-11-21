import { headers } from 'next/headers';

import { getAppOrigin } from '@/lib/server/app-url';

/**
 * Origin for absolute URLs (verification links, etc.) in a server component.
 *
 * The configured app URL wins, as for every other site address (GP-756). The request's own
 * host is only a fallback when no app URL is configured, and never a local one in production.
 */
export async function getServerOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return getAppOrigin(host ? { nextUrl: { origin: `${proto}://${host}` } } : null);
}
