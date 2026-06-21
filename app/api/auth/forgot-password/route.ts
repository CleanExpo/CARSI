import { NextRequest, NextResponse } from 'next/server';

import { signPasswordResetToken } from '@/lib/auth/session-jwt';
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/server/auth-email';
import { getAppOrigin } from '@/lib/server/app-url';
import { prisma } from '@/lib/prisma';

// Neutral message returned whether or not the account exists, so the endpoint
// cannot be used to enumerate registered email addresses.
const SENT_MESSAGE = 'If an account exists for that email, a password reset link has been sent.';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

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
    return NextResponse.json(
      {
        error: 'Password reset service unavailable',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
