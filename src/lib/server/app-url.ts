import type { NextRequest } from 'next/server';

/** Canonical public site URL for links in emails (env first, then request origin). */
export function getAppOrigin(request?: NextRequest | null): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_FRONTEND_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const requestOrigin = request?.nextUrl?.origin?.replace(/\/$/, '');
  if (requestOrigin && !/^https?:\/\/localhost(?::\d+)?$/i.test(requestOrigin)) {
    return requestOrigin;
  }

  return process.env.NODE_ENV === 'production' ? 'https://carsi.com.au' : 'http://localhost:3000';
}
