import { NextRequest, NextResponse } from 'next/server';

import { isOnboardingCourse, parseOnboardingMeta } from '@/lib/onboarding/enterprise';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { formatLmsCourseCecHoursLabel } from '@/lib/server/course-cec-hours';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limitRaw = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '8', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 8;

  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ items: [] });
  }

  try {
    const courses = await prisma.lmsCourse.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ title: 'asc' }],
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        meta: true,
        iicrcDiscipline: true,
        cecHours: true,
      },
    });

    const items = courses.map((course) => {
      const onboarding = isOnboardingCourse(course);
      const meta = parseOnboardingMeta(course.meta);
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        iicrc_discipline: course.iicrcDiscipline,
        // REGISTRY-ONLY, FAIL-CLOSED (GP-498). The stored `cecHours` column is WP-import
        // pollution — never IICRC approval — so it is never surfaced. CEC hours come solely
        // from the approvals registry via the gate; no approval → null (no CEC in search).
        cec_hours: formatLmsCourseCecHoursLabel({
          slug: course.slug,
          cecHours: typeof course.cecHours === 'number' ? course.cecHours : null,
          iicrcDiscipline: course.iicrcDiscipline,
        }),
        is_onboarding: onboarding,
        program_label: onboarding ? (meta?.program ?? 'Organisation onboarding') : null,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error('[lms/search]', e);
    return NextResponse.json({ detail: 'Search failed' }, { status: 500 });
  }
}
