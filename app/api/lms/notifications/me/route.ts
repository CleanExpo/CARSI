import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { listForUser } from '@/lib/server/notifications';

/** GET /api/lms/notifications/me — current user's recent notifications + unread count (bell). */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }

  try {
    const summary = await listForUser(claims.sub);
    return NextResponse.json(summary);
  } catch (e) {
    console.error('[notifications/me]', e);
    return NextResponse.json({ detail: 'Failed to load notifications' }, { status: 500 });
  }
}
