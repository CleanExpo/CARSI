import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { prisma } from '@/lib/prisma';
import { reviewProposedCoachingAction } from '@/lib/server/carsi-coaching-actions-store';

export const dynamic = 'force-dynamic';

/** GP-634: proposed coaching actions waiting for the coach, across all members. */
export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.carsiCoachingAction.findMany({
    where: { status: 'proposed' },
    orderBy: [{ userId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    take: 500,
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      createdAt: true,
      user: {
        select: {
          email: true,
          fullName: true,
          coachingBusinessProfile: { select: { businessName: true, location: true } },
        },
      },
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      createdAt: r.createdAt.toISOString(),
      member: {
        email: r.user.email,
        name: r.user.fullName,
        businessName: r.user.coachingBusinessProfile?.businessName ?? null,
        location: r.user.coachingBusinessProfile?.location ?? null,
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
    coachFeedback: typeof body?.coachFeedback === 'string' ? body.coachFeedback : null,
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
