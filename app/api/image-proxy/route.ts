import { NextRequest } from 'next/server';

const ALLOWED_HOSTS = new Set(['carsi.com.au', 'www.carsi.com.au']);

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return new Response('Host not allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        // Avoid some anti-hotlink blocks that require an origin/referer.
        Referer: 'https://carsi.com.au/',
      },
      cache: 'force-cache',
      next: { revalidate: 60 * 60 * 12 },
    });

    if (!upstream.ok) {
      return new Response('Image unavailable', { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=43200, s-maxage=43200, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response('Proxy fetch failed', { status: 502 });
  }
}

