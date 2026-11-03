import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { prisma } from '@/lib/prisma';
import { assignMemberToCoach } from '@/lib/server/carsi-coaching-coaches';

export const dynamic = 'force-dynamic';

/**
 * Admin assigns a coaching member (by account email) to a chapter (GP-632). `coachId: null`
 * returns the member to the default coach.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    memberEmail?: unknown;
    coachId?: unknown;
  };
  const memberEmail =
    typeof body.memberEmail === 'string' ? body.memberEmail.trim().toLowerCase() : '';
  const coachId = body.coachId === null ? null : typeof body.coachId === 'string' ? body.coachId : undefined;
  if (!memberEmail || coachId === undefined) {
    return NextResponse.json({ detail: 'memberEmail and coachId (or null) are required.' }, { status: 400 });
  }

  try {
    const user = await prisma.lmsUser.findUnique({ where: { email: memberEmail }, select: { id: true } });
    if (!user) return NextResponse.json({ detail: 'No account with that email.' }, { status: 404 });
    const result = await assignMemberToCoach(user.id, coachId);
    if (!result.ok) return NextResponse.json({ detail: result.detail }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/business-coaching/coaches/assign]', error);
    return NextResponse.json({ detail: 'Failed to assign member.' }, { status: 500 });
  }
}
