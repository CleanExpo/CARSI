import { type NextRequest, NextResponse } from 'next/server';

import { verifyEmailUnsubscribeToken } from '@/lib/auth/session-jwt';
import { setEmailOptOut } from '@/lib/server/email-preferences';

/**
 * Public, token-authenticated unsubscribe endpoint — no session cookie required.
 * The signed token (subject = user id) IS the authorization, so a recipient can
 * unsubscribe straight from an email link (Spam Act one-click facility).
 *
 * POST /api/unsubscribe?token=...   body: { resubscribe?: boolean }
 *   default → opt the user OUT of non-transactional email
 *   { resubscribe: true } → opt them back IN (the confirmation page's toggle)
 *
 * Also honours RFC 8058 List-Unsubscribe=One-Click, where mail clients POST here
 * directly with a `List-Unsubscribe=One-Click` form body.
 */
async function resolveResubscribe(request: NextRequest): Promise<boolean> {
  const contentType = request.headers.get('content-type') ?? '';
  // RFC 8058 one-click posts `application/x-www-form-urlencoded` — always an opt-out.
  if (contentType.includes('application/x-www-form-urlencoded')) return false;
  try {
    const body = (await request.json()) as { resubscribe?: unknown };
    return body?.resubscribe === true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ detail: 'Missing token' }, { status: 400 });
  }

  const userId = await verifyEmailUnsubscribeToken(token);
  if (!userId) {
    return NextResponse.json({ detail: 'Invalid or expired link' }, { status: 401 });
  }

  const resubscribe = await resolveResubscribe(request);

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true, email_opt_out: !resubscribe });
  }

  try {
    const prefs = await setEmailOptOut(userId, !resubscribe);
    return NextResponse.json({ ok: true, ...prefs });
  } catch (e) {
    console.error('[unsubscribe] POST', e);
    return NextResponse.json({ detail: 'Failed to update subscription' }, { status: 500 });
  }
}
