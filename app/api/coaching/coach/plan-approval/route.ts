import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { approveMemberDraftPlan, getCoachForViewer } from '@/lib/server/carsi-coaching-coaches';

/** Coach approves a member's draft growth plan (GP-632 / GP-628). */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const coach = await getCoachForViewer(claims);
  if (!coach) return NextResponse.json({ detail: 'Coach access required.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { memberUserId?: unknown } | null;
  const memberUserId = typeof body?.memberUserId === 'string' ? body.memberUserId.trim() : '';
  if (!memberUserId) {
    return NextResponse.json({ detail: 'memberUserId required.' }, { status: 400 });
  }

  const result = await approveMemberDraftPlan(coach, memberUserId);
  if (!result.ok) return NextResponse.json({ detail: result.detail }, { status: result.status });
  return NextResponse.json({ ok: true });
}
