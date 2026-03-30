import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/lms/credentials/me — list credentials for the signed-in learner.
 * When upstream is configured, proxies to the legacy API; otherwise Prisma.
 */
export async function GET(request: NextRequest) {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const url = `${upstream.replace(/\/$/, '')}/api/lms/credentials/me`;
    const res = await fetch(url, {
      headers: {
        authorization: request.headers.get('authorization') ?? '',
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const rows = await prisma.lmsEnrollment.findMany({
    where: {
      studentId: claims.sub,
      status: 'completed',
      completedAt: { not: null },
    },
    include: { course: true },
    orderBy: { completedAt: 'desc' },
  });

  const origin = request.nextUrl.origin;

  const out = rows.map((e) => ({
    credential_id: e.id,
    course_title: e.course.title,
    iicrc_discipline: e.course.iicrcDiscipline,
    cec_hours: Number(e.course.cecHours ?? 0),
    cppp40421_unit_code: null as string | null,
    issued_date: (e.certificateIssuedAt ?? e.completedAt)!.toISOString().slice(0, 10),
    verification_url: `${origin}/dashboard/credentials/${e.id}`,
    status: 'issued',
  }));

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
