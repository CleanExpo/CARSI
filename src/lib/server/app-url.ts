import type { NextRequest } from 'next/server';

/** Canonical public site URL for links in emails (env first, then request origin). */
export function getAppOrigin(request?: NextRequest | null): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_FRONTEND_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (request?.nextUrl?.origin) return request.nextUrl.origin.replace(/\/$/, '');
  return 'http://localhost:3000';
}
