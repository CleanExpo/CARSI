/**
 * Catch-all for `/api/lms/*` not implemented as a dedicated route.
 * - When BACKEND_URL / NEXT_PUBLIC_BACKEND_URL is set: proxy to upstream LMS.
 * - Otherwise: return minimal JSON stubs so local / headless dev UIs load without 404s.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

type Ctx = { params: Promise<{ path?: string[] }> };

async function proxyToUpstream(
  request: NextRequest,
  method: string,
  segments: string[]
): Promise<NextResponse | null> {
  const upstream = getUpstreamBaseUrl();
  if (!upstream) return null;

  const tail = segments.map((s) => encodeURIComponent(s)).join('/');
  const search = request.nextUrl.search;
  const url = `${upstream.replace(/\/$/, '')}/api/lms/${tail}${search}`;

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const ct = request.headers.get('content-type');
  if (ct) headers.set('content-type', ct);

  const init: RequestInit = { method, headers, cache: 'no-store' };
  if (method !== 'GET' && method !== 'HEAD') {
    const body = await request.text();
    if (body) init.body = body;
  }

  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || 'application/json';
  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: res.status,
    headers: { 'content-type': contentType },
  });
}

function localStub(method: string, segments: string[]): NextResponse | null {
  const key = segments.join('/');

  if (method === 'GET' && key === 'recommendations/next-course') {
    return NextResponse.json([]);
  }

  if (method === 'GET' && key === 'subscription/status') {
    return NextResponse.json({
      has_subscription: false,
      status: null,
      plan: null,
      current_period_end: null,
      trial_end: null,
    });
  }

  if (method === 'GET' && key === 'gamification/me/level') {
    return NextResponse.json({
      total_xp: 0,
      current_level: 1,
      level_title: 'Getting started',
      current_streak: 0,
      longest_streak: 0,
      xp_to_next_level: 100,
      total_cec_lifetime: 0,
    });
  }

  if (method === 'POST' && key === 'subscription/portal') {
    return NextResponse.json({ url: '' });
  }

  if (method === 'POST' && key === 'subscription/checkout') {
    // Avoid 503 so the client can show a message instead of a generic network error.
    return NextResponse.json({ url: '' });
  }

  if (method === 'GET' && key === 'notifications/me') {
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }

  if (method === 'POST' && key === 'notifications/me/read-all') {
    return NextResponse.json({ ok: true });
  }

  if (method === 'PATCH' && segments[0] === 'notifications' && segments[2] === 'read') {
    return NextResponse.json({ ok: true });
  }

  if (method === 'GET' && key === 'gamification/leaderboard') {
    return NextResponse.json({ items: [] });
  }

  return null;
}

function notConfiguredResponse(): NextResponse {
  return NextResponse.json(
    {
      detail:
        'LMS API not configured. Set BACKEND_URL or NEXT_PUBLIC_BACKEND_URL to proxy to your API.',
    },
    { status: 503 }
  );
}

async function handle(
  request: NextRequest,
  method: string,
  ctx: Ctx
): Promise<NextResponse> {
  const { path = [] } = await ctx.params;

  const proxied = await proxyToUpstream(request, method, path);
  if (proxied) return proxied;

  const stub = localStub(method, path);
  if (stub) return stub;

  return notConfiguredResponse();
}

export async function GET(request: NextRequest, ctx: Ctx) {
  return handle(request, 'GET', ctx);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return handle(request, 'POST', ctx);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return handle(request, 'PATCH', ctx);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  return handle(request, 'PUT', ctx);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return handle(request, 'DELETE', ctx);
}
