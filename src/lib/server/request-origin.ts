import { headers } from 'next/headers';

/** Origin for absolute URLs (verification links, etc.) from the incoming request. */
export async function getServerOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  if (host) {
    return `${proto}://${host}`;
  }
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) {
    return env.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}
