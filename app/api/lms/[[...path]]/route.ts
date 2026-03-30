/**
 * Catch-all for `/api/lms/*` not implemented as a dedicated route.
 * Returns minimal JSON stubs so optional LMS UI calls do not 404.
 */

import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ path?: string[] }> };

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
    { detail: 'This LMS endpoint is not implemented in this app build.' },
    { status: 503 }
  );
}

async function handle(method: string, ctx: Ctx): Promise<NextResponse> {
  const { path = [] } = await ctx.params;

  const stub = localStub(method, path);
  if (stub) return stub;

  return notConfiguredResponse();
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  return handle('GET', ctx);
}

export async function POST(_request: NextRequest, ctx: Ctx) {
  return handle('POST', ctx);
}

export async function PATCH(_request: NextRequest, ctx: Ctx) {
  return handle('PATCH', ctx);
}

export async function PUT(_request: NextRequest, ctx: Ctx) {
  return handle('PUT', ctx);
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  return handle('DELETE', ctx);
}
