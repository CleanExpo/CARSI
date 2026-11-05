import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { normalizeCoachFeedback } from '@/lib/coaching-portal/marketing-pack/coach-input-limits';
import { MARKETING_ACTION_GOAL_PREFIX } from '@/lib/coaching-portal/marketing-pack/proposed-actions';
import { prisma } from '@/lib/prisma';
import { reviewProposedCoachingAction } from '@/lib/server/carsi-coaching-actions-store';
import {
  loadMarketingFixMetaByUserId,
  marketingMetaForAction,
} from '@/lib/server/carsi-coaching-marketing-proposed-meta';

export const dynamic = 'force-dynamic';

/** GP-634: marketing-pack fixes waiting for coach approval. */
export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.carsiCoachingAction.findMany({
    where: {
      status: 'proposed',
      goalId: { startsWith: MARKETING_ACTION_GOAL_PREFIX },
    },
    orderBy: [{ userId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    take: 500,
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      priority: true,
      goalId: true,
      sortOrder: true,
      createdAt: true,
      user: {
        select: {
          email: true,
          fullName: true,
          coachingBusinessProfile: {
            select: { businessName: true, location: true, website: true, googleBusinessUrl: true },
          },
        },
      },
    },
  });

  const packByUser = await loadMarketingFixMetaByUserId([...new Set(rows.map((r) => r.userId))]);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      createdAt: r.createdAt.toISOString(),
      marketing: marketingMetaForAction(r.userId, r.goalId, r.sortOrder, packByUser),
      member: {
        email: r.user.email,
        name: r.user.fullName,
        businessName: r.user.coachingBusinessProfile?.businessName ?? null,
        location: r.user.coachingBusinessProfile?.location ?? null,
        website: r.user.coachingBusinessProfile?.website ?? null,
        googleBusinessUrl: r.user.coachingBusinessProfile?.googleBusinessUrl ?? null,
      },
    })),
  });
}

/** Coach approves or declines one proposed action. */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const actionId = typeof body?.actionId === 'string' ? body.actionId.trim() : '';
  const decision = body?.decision;
  if (!actionId || (decision !== 'approve' && decision !== 'decline')) {
    return NextResponse.json(
      { detail: 'actionId and decision (approve|decline) required.' },
      { status: 400 }
    );
  }
  if (!/^[0-9a-f-]{36}$/i.test(actionId)) {
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  }

  const result = await reviewProposedCoachingAction({
    actionId,
    decision,
    coachFeedback: normalizeCoachFeedback(body?.coachFeedback),
  });
  if (!result.ok) {
    return NextResponse.json(
      {
        detail: result.reason === 'not_found' ? 'Not found.' : 'This action was already reviewed.',
      },
      { status: result.reason === 'not_found' ? 404 : 409 }
    );
  }
  return NextResponse.json({ ok: true, status: result.status });
}
