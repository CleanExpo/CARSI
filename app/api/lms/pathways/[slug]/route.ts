import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/lms/pathways/[slug] — pathway detail with ordered courses. */
export async function GET(_request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  try {
    const pathway = await prisma.lmsLearningPathway.findFirst({
      where: { slug, isPublished: true },
      include: {
        courses: {
          orderBy: { orderIndex: 'asc' },
          include: {
            course: {
              select: {
                id: true,
                slug: true,
                title: true,
                shortDescription: true,
                thumbnailUrl: true,
                priceAud: true,
                isPublished: true,
              },
            },
          },
        },
      },
    });

    if (!pathway) {
      return NextResponse.json({ detail: 'Pathway not found' }, { status: 404 });
    }

    const courses = pathway.courses
      .filter((pc) => pc.course.isPublished)
      .map((pc) => ({
        id: pc.course.id,
        slug: pc.course.slug,
        title: pc.course.title,
        short_description: pc.course.shortDescription,
        thumbnail_url: pc.course.thumbnailUrl,
        price_aud: Number(pc.course.priceAud),
        order_index: pc.orderIndex,
      }));

    return NextResponse.json({
      id: pathway.id,
      slug: pathway.slug,
      title: pathway.title,
      description: pathway.description,
      iicrc_discipline: pathway.iicrcDiscipline,
      target_certification: pathway.targetCertification,
      estimated_hours: pathway.estimatedHours,
      courses,
    });
  } catch (e) {
    console.error('[pathways/slug]', e);
    return NextResponse.json({ detail: 'Failed to load pathway' }, { status: 500 });
  }
}
