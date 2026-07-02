import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { markAllRead } from '@/lib/server/notifications';

/** POST /api/lms/notifications/me/read-all — mark all of the current user's notifications read. */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true });
  }

  try {
    await markAllRead(claims.sub);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[notifications/me/read-all]', e);
    return NextResponse.json({ detail: 'Failed to mark notifications read' }, { status: 500 });
  }
}
