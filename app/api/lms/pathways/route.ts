import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

/** GET /api/lms/pathways — published pathways with course counts. */
export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ items: [], total: 0 });
  }

  try {
    const rows = await prisma.lmsLearningPathway.findMany({
      where: { isPublished: true },
      orderBy: { orderIndex: 'asc' },
      include: { _count: { select: { courses: true } } },
    });

    const items = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      iicrc_discipline: p.iicrcDiscipline,
      target_certification: p.targetCertification,
      estimated_hours: p.estimatedHours,
      course_count: p._count.courses,
    }));

    return NextResponse.json({ items, total: items.length });
  } catch (e) {
    console.error('[pathways]', e);
    return NextResponse.json({ detail: 'Failed to load pathways' }, { status: 500 });
  }
}
