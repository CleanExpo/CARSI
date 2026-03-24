import { NextResponse } from 'next/server';

/** Optional external HTTP API (legacy FastAPI replacement). Empty = not configured. */
export function getUpstreamBaseUrl(): string | null {
  const u = process.env.BACKEND_URL?.trim() || process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  return u || null;
}

export function upstreamNotConfigured(): NextResponse {
  return NextResponse.json(
    {
      detail:
        'External API not configured. Set BACKEND_URL or NEXT_PUBLIC_BACKEND_URL to your TypeScript service.',
    },
    { status: 503 }
  );
}
