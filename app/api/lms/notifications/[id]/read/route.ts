import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { markRead } from '@/lib/server/notifications';

/** PATCH /api/lms/notifications/:id/read — mark one notification read (scoped to the owner). */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true });
  }

  try {
    await markRead(id, claims.sub);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[notifications/:id/read]', e);
    return NextResponse.json({ detail: 'Failed to mark notification read' }, { status: 500 });
  }
}
