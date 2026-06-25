import { type NextRequest, NextResponse } from 'next/server';

import { adminResetUserPassword } from '@/lib/admin/admin-password-reset';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getAppOrigin } from '@/lib/server/app-url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ userId: string }> };

type ResetBody = {
  password?: string;
  sendEmail?: boolean;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { userId } = await context.params;
  const id = typeof userId === 'string' ? userId.trim() : '';
  if (!id) {
    return NextResponse.json({ detail: 'Invalid user id' }, { status: 400 });
  }

  let body: ResetBody = {};
  try {
    body = (await request.json()) as ResetBody;
  } catch {
    body = {};
  }

  const password = typeof body.password === 'string' ? body.password : undefined;
  const sendEmail = body.sendEmail !== false;

  try {
    const result = await adminResetUserPassword({
      userId: id,
      password,
      sendEmail,
      appOrigin: getAppOrigin(request),
      initiatedByAdminEmail: session.email,
    });

    return NextResponse.json({
      ok: true,
      password: result.password,
      email: result.email,
      emailSent: result.emailSent,
      generated: result.generated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'USER_NOT_FOUND') {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }
    if (msg === 'INVALID_PASSWORD') {
      return NextResponse.json(
        { detail: 'Password must be at least 8 characters and not only spaces.' },
        { status: 400 },
      );
    }
    console.error('[admin/users/reset-password]', e);
    return NextResponse.json({ detail: 'Failed to reset password' }, { status: 500 });
  }
}
