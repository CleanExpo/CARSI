import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  isCoachingMember,
  listCoachingLearningMembers,
} from '@/lib/server/carsi-coaching-learning-path';
import {
  approveMonthlyReview,
  discardMonthlyReview,
  generateMonthlyReview,
  getMonthlyReviewView,
  MonthlyReviewConflictError,
  saveMonthlyReview,
  type MonthlyReviewWriteResult,
} from '@/lib/server/carsi-coaching-monthly-review';
import { isUuidParam } from '@/lib/server/uuid-param';

export const dynamic = 'force-dynamic';

/**
 * GP-629 AI monthly review. Admin (coach) only; nothing here is readable by a member.
 * GET            → coaching members
 * GET ?userId=   → that member's draft review (or none) and the editor's context
 * POST           → { userId, op: 'generate' | 'save' | 'approve' | 'discard', edits? }
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
  if (!(await isCoachingMember(userId))) {
    return NextResponse.json({ detail: 'Not a coaching member.' }, { status: 404 });
  }
  return NextResponse.json(await getMonthlyReviewView(userId));
}

const RESULT_HTTP: Record<MonthlyReviewWriteResult['status'], number> = {
  saved: 200,
  approved: 200,
  discarded: 200,
  nothing_to_approve: 409,
  conflict: 409,
  invalid: 400,
};

export async function POST(request: NextRequest) {
  if (!(await getAdminSessionOrNull())) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const userId = typeof body?.userId === 'string' ? body.userId : '';
  if (!isUuidParam(userId)) {
    return NextResponse.json({ detail: 'Invalid userId.' }, { status: 400 });
  }
  if (!(await isCoachingMember(userId))) {
    return NextResponse.json({ detail: 'Not a coaching member.' }, { status: 404 });
  }

  if (body?.op === 'generate') {
    try {
      return NextResponse.json(await generateMonthlyReview(userId));
    } catch (e) {
      if (e instanceof MonthlyReviewConflictError) {
        return NextResponse.json({ detail: e.message }, { status: 409 });
      }
      throw e;
    }
  }

  // The draft version the coach's editor holds. Writes against any other version are refused.
  const revision = typeof body?.revision === 'string' ? body.revision : null;
  let result: MonthlyReviewWriteResult;
  if (body?.op === 'save') result = await saveMonthlyReview(userId, body.edits, revision);
  else if (body?.op === 'approve')
    result = await approveMonthlyReview(userId, body.edits, revision);
  else if (body?.op === 'discard') result = await discardMonthlyReview(userId, revision);
  else return NextResponse.json({ detail: 'Unknown op.' }, { status: 400 });

  const view = await getMonthlyReviewView(userId);
  const detail =
    result.status === 'invalid' || result.status === 'conflict'
      ? result.detail
      : result.status === 'nothing_to_approve'
        ? 'There is no draft review to approve. Generate one first.'
        : undefined;
  return NextResponse.json({ result, detail, ...view }, { status: RESULT_HTTP[result.status] });
}
