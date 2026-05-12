import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminEmail,
  getAdminPassword,
} from '@/lib/admin/admin-auth';
import {
  adminCount,
  recordAdminLogin,
  verifyAdminByEmail,
} from '@/lib/admin/admin-store';
import { applyRateLimit, UNKNOWN_IP } from '@/lib/rate-limit';

// RA-3027 — rate-limit admin login (defense-in-depth) + DB-backed lookup.
//
// While `admin_users` table is empty, env-var login (legacy single-admin)
// still works. Once any row exists, env-var login is locked out — the
// bootstrap script (`pnpm db:admin-bootstrap`) is the documented path
// to populate the first row.
//
// 10 attempts per 15-minute window per IP. Cap chosen above legitimate
// password-retry rates (3-5 attempts) but well below brute-force rates.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    UNKNOWN_IP
  );
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

async function logAdminEvent(event: {
  outcome: 'success' | 'failure';
  email: string;
  ip: string;
  reason?: string;
}): Promise<void> {
  // Best-effort audit log to console. Structured (JSON) so it's
  // grep-able from log aggregators. Audit table is a separate
  // follow-up — RA-3027 ticket explicitly splits it out.
  try {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        kind: 'admin_login',
        ...event,
      }),
    );
  } catch {
    // Swallow logging errors — never block a login attempt on them.
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // 1. Rate limit BEFORE body parse so brute-force attempts cost less.
  const rl = applyRateLimit(`admin:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.ok) {
    await logAdminEvent({ outcome: 'failure', email: '', ip, reason: 'rate_limited' });
    return NextResponse.json(
      { detail: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';

    if (!email || !password) {
      await logAdminEvent({ outcome: 'failure', email, ip, reason: 'missing_fields' });
      return NextResponse.json({ detail: 'Email and password are required' }, { status: 400 });
    }

    // 2. Try the DB-backed table first. If empty, fall back to env-var
    //    (bootstrap mode — legacy single-admin still works).
    const count = await adminCount();

    if (count > 0) {
      const admin = await verifyAdminByEmail(email, password);
      if (!admin) {
        await logAdminEvent({
          outcome: 'failure', email, ip, reason: 'db_invalid_credentials',
        });
        return NextResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
      }
      await recordAdminLogin(admin.id, ip === UNKNOWN_IP ? null : ip);
      const token = await createAdminSessionToken(admin.email);
      await logAdminEvent({ outcome: 'success', email: admin.email, ip });
      return setCookieAndReturn(token);
    }

    // Bootstrap mode: env-var single-admin path.
    const expectedEmail = getAdminEmail();
    const expectedPassword = getAdminPassword();
    const emailMatch = email.toLowerCase() === expectedEmail.toLowerCase();
    const passwordMatch =
      !!expectedPassword && constantTimeEqual(password, expectedPassword);
    if (!emailMatch || !passwordMatch) {
      await logAdminEvent({
        outcome: 'failure', email, ip, reason: 'env_invalid_credentials',
      });
      return NextResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
    }
    const token = await createAdminSessionToken(email);
    await logAdminEvent({
      outcome: 'success', email, ip, reason: 'env_bootstrap_mode',
    });
    return setCookieAndReturn(token);
  } catch (_e) {
    return NextResponse.json({ detail: 'Admin login failed' }, { status: 500 });
  }
}

function setCookieAndReturn(token: string): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
  return res;
}
