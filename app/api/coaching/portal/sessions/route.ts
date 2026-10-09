import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const sessions = await prisma.carsiCoachingSession.findMany({
    where: { userId: claims.sub },
    orderBy: { scheduledAt: 'desc' },
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      scheduledAt: s.scheduledAt.toISOString(),
      durationMinutes: s.durationMinutes,
      coachName: s.coachName,
      meetingUrl: s.meetingUrl,
      status: s.status,
      prepResponsesJson: s.prepResponsesJson,
      customerSummary: s.customerSummary,
      decisionsJson: s.decisionsJson,
      followUpAt: s.followUpAt?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    prep?: { progress?: string; challenges?: string; discuss?: string };
  } | null;

  if (!body?.sessionId) {
    return NextResponse.json({ detail: 'sessionId required.' }, { status: 400 });
  }

  const session = await prisma.carsiCoachingSession.findFirst({
    where: { id: body.sessionId, userId: claims.sub },
  });
  if (!session) return NextResponse.json({ detail: 'Not found.' }, { status: 404 });

  const prepResponsesJson = JSON.stringify(body.prep ?? {});

  await prisma.carsiCoachingSession.update({
    where: { id: session.id },
    data: { prepResponsesJson },
  });

  return NextResponse.json({ ok: true });
}
