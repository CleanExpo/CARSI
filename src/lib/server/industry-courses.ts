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

const INDUSTRY_COURSE_SELECT = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  priceAud: true,
  isFree: true,
  iicrcDiscipline: true,
  thumbnailUrl: true,
} as const;

function toIndustryCourseItem(c: {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  priceAud: unknown;
  isFree: boolean;
  iicrcDiscipline: string | null;
  thumbnailUrl: string | null;
}): IndustryCourseItem {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    short_description: c.shortDescription,
    price_aud: Number(c.priceAud),
    is_free: c.isFree,
    discipline: c.iicrcDiscipline,
    thumbnail_url: c.thumbnailUrl,
  };
}

/** Preserve the marketing order of a slug list after a batched DB read. */
export function orderCoursesBySlug<T extends { slug: string }>(courses: T[], slugs: string[]): T[] {
  const bySlug = new Map(courses.map((course) => [course.slug, course]));
  const seen = new Set<string>();
  const ordered: T[] = [];
  for (const slug of slugs) {
    const course = bySlug.get(slug);
    if (!course || seen.has(course.slug)) continue;
    seen.add(course.slug);
    ordered.push(course);
  }
  return ordered;
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
      select: INDUSTRY_COURSE_SELECT,
    });

    for (const c of rows) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      combined.push(toIndustryCourseItem(c));
    }
  }

  return combined;
}

const MAX_INDUSTRY_SLUGS = 24;

/**
 * Published courses for industry pages, pinned to specific catalogue slugs
 * (IICRC CEC Accredited intros) rather than IICRC discipline codes.
 */
export async function getIndustryCoursesBySlugs(
  slugs: readonly string[]
): Promise<IndustryCourseItem[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];

  const requested = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))].slice(
    0,
    MAX_INDUSTRY_SLUGS
  );
  if (requested.length === 0) return [];

  const rows = await prisma.lmsCourse.findMany({
    where: {
      ...lmsPublishedCourseWhere,
      slug: { in: requested },
    },
    take: requested.length,
    select: INDUSTRY_COURSE_SELECT,
  });

  return orderCoursesBySlug(rows.map(toIndustryCourseItem), requested);
}
