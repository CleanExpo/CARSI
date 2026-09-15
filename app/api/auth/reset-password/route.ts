import { NextRequest, NextResponse } from 'next/server';

import { getPostLoginRedirectPath } from '@/lib/admin/admin-auth';
import { isSafeInternalPath } from '@/lib/auth/guest-recovery-path';
import { SESSION_SENTINEL_COOKIE } from '@/lib/auth/session-sentinel';
import { signSessionToken, verifyPasswordResetToken } from '@/lib/auth/session-jwt';
import { validateNewPassword } from '@/lib/auth/password-policy';
import { hashPassword, sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  try {
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

    const userId = await verifyPasswordResetToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const user = await prisma.lmsUser.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    await prisma.lmsUser.update({
      where: { id: userId },
      data: { hashedPassword: await hashPassword(newPassword) },
    });

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
