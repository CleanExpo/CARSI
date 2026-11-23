import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { parseOnboardingSnapshotJson } from '@/lib/coaching-portal/onboarding-snapshot';
import {
  generateAndStoreOnboardingCoachBrief,
  getOnboardingCoachBriefForCoach,
} from '@/lib/server/carsi-coaching-onboarding-brief';
import { isCoachingMember } from '@/lib/server/carsi-coaching-learning-path';
import { prisma } from '@/lib/prisma';
import { isUuidParam } from '@/lib/server/uuid-param';

export const dynamic = 'force-dynamic';

/**
 * GP-628 / A1 — coach-only onboarding brief (not shown to members on the packet page).
 * GET ?userId=  → stored brief
 * POST         → { userId, op: 'regenerate' }
 */
export async function GET(request: NextRequest) {
  if (!(await getAdminSessionOrNull())) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId || !isUuidParam(userId)) {
    return NextResponse.json({ detail: 'userId required.' }, { status: 400 });
  }
  if (!(await isCoachingMember(userId))) {
    return NextResponse.json({ detail: 'Not a coaching member.' }, { status: 404 });
  }
  const brief = await getOnboardingCoachBriefForCoach(userId);
  return NextResponse.json({ brief });
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSessionOrNull())) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { userId?: string; op?: string } | null;
  const userId = body?.userId;
  if (!userId || !isUuidParam(userId) || body?.op !== 'regenerate') {
    return NextResponse.json({ detail: 'Invalid request.' }, { status: 400 });
  }
  if (!(await isCoachingMember(userId))) {
    return NextResponse.json({ detail: 'Not a coaching member.' }, { status: 404 });
  }
  const profile = await prisma.carsiCoachingBusinessProfile.findUnique({
    where: { userId },
    select: { onboardingSnapshotJson: true },
  });
  if (!profile?.onboardingSnapshotJson) {
    return NextResponse.json({ detail: 'No onboarding snapshot.' }, { status: 404 });
  }
  const snapshot = parseOnboardingSnapshotJson(profile.onboardingSnapshotJson);
  if (!snapshot) {
    return NextResponse.json({ detail: 'Invalid snapshot.' }, { status: 422 });
  }
  const brief = await generateAndStoreOnboardingCoachBrief(userId, snapshot);
  return NextResponse.json({ brief });
}