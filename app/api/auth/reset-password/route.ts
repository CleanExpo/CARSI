import { NextRequest, NextResponse } from 'next/server';

import { verifyPasswordResetToken } from '@/lib/auth/session-jwt';
import { hashPassword } from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body.new_password === 'string' ? body.new_password : '';

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Reset token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
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

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Reset service unavailable',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
