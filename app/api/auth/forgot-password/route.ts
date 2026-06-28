import { NextRequest, NextResponse } from 'next/server';

import { signPasswordResetToken } from '@/lib/auth/session-jwt';
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/server/auth-email';
import { getAppOrigin } from '@/lib/server/app-url';
import { prisma } from '@/lib/prisma';
import { applyRateLimit, clientIpFrom } from '@/lib/rate-limit';

// Neutral message returned whether or not the account exists, so the endpoint
// cannot be used to enumerate registered email addresses.
const SENT_MESSAGE = 'If an account exists for that email, a password reset link has been sent.';

// Limits to stop reset-email flooding / token grinding. Per-IP guards a single
// source; per-email stops bombing a known victim's inbox from many IPs.
const IP_LIMIT = 5;
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_LIMIT = 3;
const EMAIL_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function tooMany(resetAt: number) {
  return NextResponse.json(
    { message: SENT_MESSAGE },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) },
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFrom(
      request.headers.get('x-forwarded-for'),
      request.headers.get('x-real-ip'),
    );
    const ipRl = applyRateLimit(`forgot-pw-ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
    if (!ipRl.ok) return tooMany(ipRl.resetAt);

    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    const emailRl = applyRateLimit(`forgot-pw-email:${normalized}`, EMAIL_LIMIT, EMAIL_WINDOW_MS);
    if (!emailRl.ok) return tooMany(emailRl.resetAt);

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'Password reset is temporarily unavailable.' },
        { status: 503 }
      );
    }

    const user = await prisma.lmsUser.findUnique({ where: { email: normalized } });

    // Only do work for a real, active account — but always return the same
    // neutral response below so existence is never revealed.
    if (user?.isActive) {
      const token = await signPasswordResetToken(user.id);
      const base = getAppOrigin(request);
      const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;

      const emailResult = await sendPasswordResetEmail({
        to: normalized,
        resetLink: link,
        fullName: user.fullName,
        appOrigin: base,
      });

      if (!emailResult.sent) {
        if (process.env.NODE_ENV === 'development' || !isEmailConfigured()) {
          console.info('[forgot-password] dev reset link:', link);
        } else {
          console.error(
            '[forgot-password] failed to send reset email:',
            emailResult.reason,
            '→',
            normalized
          );
        }
      } else if (emailResult.reason === 'dev_console') {
        console.info('[forgot-password] reset link (dev console):', link);
      }
    }

    return NextResponse.json({ message: SENT_MESSAGE });
  } catch (error) {
    console.error('[forgot-password]', error);
    return NextResponse.json({ error: 'Password reset service unavailable' }, { status: 502 });
  }
}
