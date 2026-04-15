import { NextRequest, NextResponse } from 'next/server';

import { signPasswordResetToken } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'Password reset via email is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const user = await prisma.lmsUser.findUnique({ where: { email: normalized } });
    if (user) {
      // Generate and log the reset token. No email transport is configured.
      // TODO: Wire up an email provider (e.g. Resend, SendGrid, or nodemailer)
      // and call it here with `link` before returning.
      const token = await signPasswordResetToken(user.id);
      const base =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() ||
        request.nextUrl.origin;
      const link = `${base.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
      if (process.env.NODE_ENV === 'development') {
        console.info('[forgot-password] dev reset link:', link);
      }
    }

    // No email transport is configured — return an honest error instead of
    // silently discarding the reset link and claiming success.
    return NextResponse.json(
      { error: 'Password reset via email is not configured. Please contact support.' },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Password reset service unavailable',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
