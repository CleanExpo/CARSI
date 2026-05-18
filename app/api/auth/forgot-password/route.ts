import { NextRequest, NextResponse } from 'next/server';

import { signPasswordResetToken } from '@/lib/auth/session-jwt';
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/server/auth-email';
import { getAppOrigin } from '@/lib/server/app-url';
import { prisma } from '@/lib/prisma';

const GENERIC_MESSAGE = 'If that email exists, a password reset link has been sent.';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const user = await prisma.lmsUser.findUnique({ where: { email: normalized } });
    if (user?.isActive) {
      const token = await signPasswordResetToken(user.id);
      const base = getAppOrigin(request);
      const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;

      const emailResult = await sendPasswordResetEmail({
        to: normalized,
        resetLink: link,
        fullName: user.fullName,
      });

      if (!emailResult.sent) {
        if (process.env.NODE_ENV === 'development' || !isEmailConfigured()) {
          console.info('[forgot-password] email not sent (%s). Dev reset link:', emailResult.reason, link);
        } else {
          console.error('[forgot-password] failed to send reset email:', emailResult.reason, '→', normalized);
        }
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
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
