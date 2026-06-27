import { NextRequest, NextResponse } from 'next/server';

import { isOnboardingCourse, parseOnboardingMeta } from '@/lib/onboarding/enterprise';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
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
        cec_hours: course.cecHours != null ? String(course.cecHours) : null,
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
