import { NextRequest, NextResponse } from 'next/server';

import { signPasswordResetToken } from '@/lib/auth/session-jwt';
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/server/auth-email';
import { getAppOrigin } from '@/lib/server/app-url';
import { prisma } from '@/lib/prisma';

const NOT_FOUND_MESSAGE = 'No account found with this email address.';
const SENT_MESSAGE = 'A password reset link has been sent to your email.';
const SEND_FAILED_MESSAGE =
  'We could not send the reset email. Please try again in a few minutes.';

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
    if (!user?.isActive) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

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
        return NextResponse.json({ message: SENT_MESSAGE });
      }
      console.error('[forgot-password] failed to send reset email:', emailResult.reason, '→', normalized);
      return NextResponse.json({ error: SEND_FAILED_MESSAGE }, { status: 502 });
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
