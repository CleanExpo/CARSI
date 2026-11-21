import { NextRequest, NextResponse } from 'next/server';

import { getPostLoginRedirectPath } from '@/lib/admin/admin-auth';
import { isSafeInternalPath } from '@/lib/auth/guest-recovery-path';
import { SESSION_SENTINEL_COOKIE } from '@/lib/auth/session-sentinel';
import { signSessionToken, verifyPasswordResetToken } from '@/lib/auth/session-jwt';
import { validateNewPassword } from '@/lib/auth/password-policy';
import { clientIpFrom } from '@/lib/rate-limit';
import { applyDurableRateLimit, retryAfterSeconds } from '@/lib/server/durable-rate-limit';
import { consumePasswordReset, hashPassword, sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { forgetSessionState } from '@/lib/server/user-active-cache';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// GP-760: each attempt costs a bcrypt hash and a database write, and the token is the only secret.
const IP_LIMIT = 10;
const IP_WINDOW_MS = 15 * 60 * 1000;

const INVALID_LINK = 'Invalid or expired reset link';

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFrom(
      request.headers.get('x-forwarded-for'),
      request.headers.get('x-real-ip')
    );
    const rl = await applyDurableRateLimit(`auth-reset-pw-ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait and try again.' },
        { status: 429, headers: { 'Retry-After': retryAfterSeconds(rl.resetAt) } }
      );
    }

    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body.new_password === 'string' ? body.new_password : '';
    const requestedNext = typeof body.next === 'string' && isSafeInternalPath(body.next) ? body.next : null;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Reset token and new password are required' },
        { status: 400 }
      );
    }

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const resetToken = await verifyPasswordResetToken(token);
    if (!resetToken) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }
    const { userId, issuedAt } = resetToken;

    // GP-760: one conditional UPDATE spends the link, sets the password and ends every other
    // session (sessions_valid_after_sec). A used, superseded or concurrent second use matches no row.
    // GP-699: the same write marks the email verified, because the reset link is only ever
    // emailed to the account address (forgot-password is its sole issuer).
    const consumed = await consumePasswordReset(userId, issuedAt, await hashPassword(newPassword));
    if (!consumed) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }
    forgetSessionState(userId);

    const claims = await sessionClaimsForUserId(userId);
    if (!claims) {
      return NextResponse.json({
        message: 'Password updated successfully.',
        redirect_to: '/login',
      });
    }

    const access_token = await signSessionToken(claims);
    const redirect_to = getPostLoginRedirectPath(claims, requestedNext);
    const response = NextResponse.json({
      message: 'Password updated successfully.',
      signed_in: true,
      redirect_to,
    });

    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    };
    response.cookies.set('auth_token', access_token, { ...cookieOptions, httpOnly: true });
    response.cookies.set('carsi_token', access_token, { ...cookieOptions, httpOnly: true });
    response.cookies.set(SESSION_SENTINEL_COOKIE, '1', { ...cookieOptions, httpOnly: false });

    return response;
  } catch (error) {
    console.error('[reset-password] failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Reset service unavailable' }, { status: 502 });
  }
}
