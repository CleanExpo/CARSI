import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  adjustLearningPath,
  assignLearningPathFromAssessment,
  getCoachLearningPathView,
  isCoachingMember,
  listCoachingLearningMembers,
} from '@/lib/server/carsi-coaching-learning-path';
import { isUuidParam } from '@/lib/server/uuid-param';

export const dynamic = 'force-dynamic';

/**
 * GP-633 coach review of prescribed learning paths. Admin (coach) only.
 * GET            → coaching members
 * GET ?userId=   → one member's gaps, path with LMS progress, and courses the coach can add
 * POST           → { userId, op: 'assign' } or { userId, op: 'adjust', add?, remove?, order? }
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
  return NextResponse.json(await getCoachLearningPathView(userId));
}

function uuidList(raw: unknown): string[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 50) return null;
  return raw.every((v) => typeof v === 'string' && isUuidParam(v)) ? (raw as string[]) : null;
}

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

  if (body?.op === 'assign') {
    const result = await assignLearningPathFromAssessment(userId);
    return NextResponse.json({ result, ...(await getCoachLearningPathView(userId)) });
  }

  if (body?.op === 'adjust') {
    const add = uuidList(body.add);
    const remove = uuidList(body.remove);
    const order = uuidList(body.order);
    if (!add || !remove || !order) {
      return NextResponse.json(
        { detail: 'add, remove and order must be course id lists.' },
        { status: 400 }
      );
    }
    await adjustLearningPath(userId, {
      addCourseIds: add,
      removeCourseIds: remove,
      orderCourseIds: order,
    });
    return NextResponse.json(await getCoachLearningPathView(userId));
  }

  return NextResponse.json({ detail: 'Unknown op.' }, { status: 400 });
}
