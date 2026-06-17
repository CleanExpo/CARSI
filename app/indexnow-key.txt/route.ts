import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();

  if (!key) {
    return new NextResponse('IndexNow key is not configured.', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  return new NextResponse(key, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
