import { prisma } from '@/lib/prisma';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';

export interface IndustryCourseItem {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  price_aud: number;
  is_free: boolean;
  discipline: string | null;
  thumbnail_url: string | null;
}

/**
 * Published courses for industry pages — direct from Postgres (Phase 3).
 */
export async function getIndustryCoursesFromDb(
  disciplines: string[],
  limitPerDiscipline = 8
): Promise<IndustryCourseItem[]> {
  if (!process.env.DATABASE_URL?.trim() || disciplines.length === 0) {
    return [];
  }

  const codes = [...new Set(disciplines.map((d) => d.trim().toUpperCase()).filter(Boolean))];
  const seen = new Set<string>();
  const combined: IndustryCourseItem[] = [];

  for (const code of codes) {
    const rows = await prisma.lmsCourse.findMany({
      where: {
        ...lmsPublishedCourseWhere,
        iicrcDiscipline: { equals: code, mode: 'insensitive' },
      },
      take: limitPerDiscipline,
      orderBy: { title: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        priceAud: true,
        isFree: true,
        iicrcDiscipline: true,
        thumbnailUrl: true,
      },
    });

    for (const c of rows) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      combined.push({
        id: c.id,
        slug: c.slug,
        title: c.title,
        short_description: c.shortDescription,
        price_aud: Number(c.priceAud),
        is_free: c.isFree,
        discipline: c.iicrcDiscipline,
        thumbnail_url: c.thumbnailUrl,
      });
    }
  }

  return combined;
}
