import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  applyCoachBriefToDraftPlan,
  getCoachingMemberWorkspace,
  regenerateCoachingMemberBrief,
  saveCoachingMemberChapter,
} from '@/lib/server/carsi-coaching-member-workspace';
import { listCoachingLearningMembers } from '@/lib/server/carsi-coaching-learning-path';
import { isUuidParam } from '@/lib/server/uuid-param';

export const dynamic = 'force-dynamic';

/**
 * GP-561 / GP-632 — coach admin: member chapter, A1 brief, draft plan from brief.
 * GET            → coaching members list
 * GET ?userId=   → workspace detail for one member
 * POST           → { userId, op, chapterSlug?, coachUserId? }
 */
export async function GET(request: NextRequest) {
  if (!(await getAdminSessionOrNull())) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const userId = request.nextUrl.searchParams.get('userId');
  if (userId === null) {
    return NextResponse.json({ members: await listCoachingLearningMembers() });
  }
  if (!isUuidParam(userId)) {
    return NextResponse.json({ detail: 'Invalid userId.' }, { status: 400 });
  }
  return NextResponse.json({ workspace: await getCoachingMemberWorkspace(userId) });
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSessionOrNull())) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    op?: string;
    chapterSlug?: string | null;
    coachUserId?: string | null;
  } | null;

  const userId = body?.userId;
  const op = body?.op;
  if (!userId || !isUuidParam(userId) || !op) {
    return NextResponse.json({ detail: 'Invalid request.' }, { status: 400 });
  }

  if (op === 'save-chapter') {
    const result = await saveCoachingMemberChapter(userId, {
      chapterSlug: body?.chapterSlug,
      coachUserId: body?.coachUserId,
    });
    if (!result.ok) return NextResponse.json({ detail: result.detail }, { status: 400 });
    return NextResponse.json({ workspace: await getCoachingMemberWorkspace(userId) });
  }

  if (op === 'regenerate-brief') {
    const result = await regenerateCoachingMemberBrief(userId);
    if (!result.ok) return NextResponse.json({ detail: result.detail }, { status: 404 });
    return NextResponse.json({
      workspace: await getCoachingMemberWorkspace(userId),
      brief: result.brief,
    });
  }

  if (op === 'apply-brief-plan') {
    const result = await applyCoachBriefToDraftPlan(userId);
    if (!result.ok) return NextResponse.json({ detail: result.detail }, { status: 400 });
    return NextResponse.json({ workspace: await getCoachingMemberWorkspace(userId) });
  }

  return NextResponse.json({ detail: 'Unknown op.' }, { status: 400 });
}