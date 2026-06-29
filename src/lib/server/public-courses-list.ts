import type { Prisma } from '@/generated/prisma/client';
import type { CheckoutCourse, CourseListItem } from '@/lib/course-list-item';
import { prisma } from '@/lib/prisma';
import { normalizePublicAssetUrl } from '@/lib/remote-image';
import { isBuildPhase } from '@/lib/server/build-phase';
import { formatLmsCourseCecHoursLabel } from '@/lib/server/course-cec-hours';

/** Same filter as the public `/courses` catalogue when loaded from Prisma. */
export const lmsPublishedCourseWhere: Prisma.LmsCourseWhereInput = {
  OR: [{ isPublished: true }, { status: { equals: 'published', mode: 'insensitive' } }],
};

const publishedWhere = lmsPublishedCourseWhere;

const draftWhere = {
  status: { equals: 'draft', mode: 'insensitive' as const },
};

export type DashboardCourseStatusFilter = 'all' | 'draft' | 'published';

function cecHoursLabelForRow(c: {
  slug: string;
  cecHours: number | null;
  shortDescription?: string | null;
  description?: string | null;
  meta?: unknown;
  durationHours?: number | null;
  iicrcDiscipline?: string | null;
}): string | null {
  return formatLmsCourseCecHoursLabel({
    slug: c.slug,
    cecHours: c.cecHours,
    shortDescription: c.shortDescription,
    description: c.description,
    meta: c.meta,
    durationHours: c.durationHours,
    iicrcDiscipline: c.iicrcDiscipline,
  });
}

function mapDashboardCourseRow(c: {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  priceAud: { toString(): string };
  isFree: boolean;
  iicrcDiscipline: string | null;
  thumbnailUrl: string | null;
  level: string | null;
  category: string | null;
  status: string;
  updatedAt: Date;
  cecHours: number | null;
  durationHours: number | null;
  _count: { modules: number };
}): CourseListItem {
  const st = c.status.trim().toLowerCase();
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    short_description: c.shortDescription,
    price_aud: Number(c.priceAud),
    is_free: c.isFree,
    discipline: c.iicrcDiscipline,
    thumbnail_url: normalizePublicAssetUrl(c.thumbnailUrl),
    level: c.level,
    category: c.category,
    lesson_count: null,
    updated_at: c.updatedAt.toISOString(),
    instructor: null,
    catalog_status: st === 'draft' ? 'draft' : 'published',
    module_count: c._count.modules,
    cec_hours: cecHoursLabelForRow(c),
    duration_hours: c.durationHours != null ? String(c.durationHours) : null,
  };
}

/**
 * Full LMS catalogue for `/dashboard/courses`: optional draft / published / all,
 * with module counts. Draft-only lists are ordered by most modules first.
 */
export async function getDashboardCourseListItemsFromDatabase(options: {
  status: DashboardCourseStatusFilter;
}): Promise<CourseListItem[]> {
  if (isBuildPhase() || !process.env.DATABASE_URL?.trim()) {
    return [];
  }

  const countInclude = {
    _count: { select: { modules: true } },
  } as const;

  if (options.status === 'draft') {
    const rows = await prisma.lmsCourse.findMany({
      where: draftWhere,
      orderBy: { modules: { _count: 'desc' } },
      include: countInclude,
    });
    return rows.map(mapDashboardCourseRow);
  }

  if (options.status === 'published') {
    const rows = await prisma.lmsCourse.findMany({
      where: publishedWhere,
      orderBy: { updatedAt: 'desc' },
      include: countInclude,
    });
    return rows.map(mapDashboardCourseRow);
  }

  const [publishedRows, draftRows] = await Promise.all([
    prisma.lmsCourse.findMany({
      where: publishedWhere,
      orderBy: { updatedAt: 'desc' },
      include: countInclude,
    }),
    prisma.lmsCourse.findMany({
      where: draftWhere,
      orderBy: { modules: { _count: 'desc' } },
      include: countInclude,
    }),
  ]);

  return [...publishedRows.map(mapDashboardCourseRow), ...draftRows.map(mapDashboardCourseRow)];
}

const publicListInclude = {
  _count: { select: { modules: true } },
  instructor: { select: { fullName: true } },
} as const;

type LmsCoursePublicListRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  priceAud: { toString(): string };
  isFree: boolean;
  iicrcDiscipline: string | null;
  thumbnailUrl: string | null;
  level: string | null;
  category: string | null;
  cecHours: number | null;
  durationHours: number | null;
  updatedAt: Date;
  instructor: { fullName: string | null } | null;
  _count: { modules: number };
};

function mapLmsCourseToPublicListItem(c: LmsCoursePublicListRow): CourseListItem {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    short_description: c.shortDescription,
    price_aud: Number(c.priceAud),
    is_free: c.isFree,
    discipline: c.iicrcDiscipline,
    thumbnail_url: normalizePublicAssetUrl(c.thumbnailUrl),
    level: c.level,
    category: c.category,
    lesson_count: null,
    module_count: c._count.modules,
    updated_at: c.updatedAt.toISOString(),
    instructor: c.instructor?.fullName ? { full_name: c.instructor.fullName } : null,
    cec_hours: cecHoursLabelForRow(c),
    duration_hours: c.durationHours != null ? String(c.durationHours) : null,
  };
}

/**
 * Homepage “Popular Courses”: three pillars (microbial/mould, water, air quality), in that order.
 * Optional `HOMEPAGE_FEATURED_COURSE_SLUGS` (comma-separated) overrides selection.
 * Fills missing slots from newest published courses.
 */
export async function getHomepageFeaturedCourses(): Promise<CourseListItem[]> {
  if (isBuildPhase() || !process.env.DATABASE_URL?.trim()) {
    return [];
  }

  const envSlugs = (process.env.HOMEPAGE_FEATURED_COURSE_SLUGS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (envSlugs.length > 0) {
    const out: CourseListItem[] = [];
    for (const slug of envSlugs) {
      if (out.length >= 3) break;
      const row = await prisma.lmsCourse.findFirst({
        where: {
          ...publishedWhere,
          slug: { equals: slug, mode: 'insensitive' },
        },
        include: publicListInclude,
      });
      if (row) out.push(mapLmsCourseToPublicListItem(row));
    }
    if (out.length >= 3) {
      return out.slice(0, 3);
    }
    const pickedIds = new Set(out.map((c) => c.id));
    const filler = await prisma.lmsCourse.findMany({
      where: { ...publishedWhere, id: { notIn: [...pickedIds] } },
      orderBy: { updatedAt: 'desc' },
      take: 3 - out.length,
      include: publicListInclude,
    });
    return [...out, ...filler.map(mapLmsCourseToPublicListItem)].slice(0, 3);
  }

  const moldWhere = {
    AND: [
      publishedWhere,
      {
        OR: [
          { category: { contains: 'Microbial', mode: 'insensitive' as const } },
          { category: { contains: 'Mould', mode: 'insensitive' as const } },
          { category: { contains: 'Mold', mode: 'insensitive' as const } },
          { iicrcDiscipline: { contains: 'AMRT', mode: 'insensitive' as const } },
        ],
      },
    ],
  };

  const waterWhere = {
    AND: [
      publishedWhere,
      {
        OR: [
          { category: { contains: 'Water Damage', mode: 'insensitive' as const } },
          { iicrcDiscipline: { contains: 'WRT', mode: 'insensitive' as const } },
        ],
      },
    ],
  };

  const airWhere = {
    AND: [
      publishedWhere,
      {
        OR: [
          { category: { contains: 'Air Quality', mode: 'insensitive' as const } },
          { title: { contains: 'Air Quality', mode: 'insensitive' as const } },
        ],
      },
    ],
  };

  const [mold, water, air] = await Promise.all([
    prisma.lmsCourse.findFirst({
      where: moldWhere,
      orderBy: { updatedAt: 'desc' },
      include: publicListInclude,
    }),
    prisma.lmsCourse.findFirst({
      where: waterWhere,
      orderBy: { updatedAt: 'desc' },
      include: publicListInclude,
    }),
    prisma.lmsCourse.findFirst({
      where: airWhere,
      orderBy: { updatedAt: 'desc' },
      include: publicListInclude,
    }),
  ]);

  const picked: LmsCoursePublicListRow[] = [];
  const seen = new Set<string>();
  for (const row of [mold, water, air]) {
    if (row && !seen.has(row.id)) {
      picked.push(row);
      seen.add(row.id);
    }
  }

  if (picked.length < 3) {
    const more = await prisma.lmsCourse.findMany({
      where: { ...publishedWhere, id: { notIn: [...seen] } },
      orderBy: { updatedAt: 'desc' },
      take: 3 - picked.length,
      include: publicListInclude,
    });
    for (const row of more) {
      if (!seen.has(row.id)) {
        picked.push(row);
        seen.add(row.id);
      }
      if (picked.length >= 3) break;
    }
  }

  return picked.slice(0, 3).map(mapLmsCourseToPublicListItem);
}

/**
 * Published catalogue rows for `/courses` and other public listings.
 * Matches the `CourseListItem` shape used by `CourseGrid` / `CourseCard`.
 *
 * @param options.limit — when set, only fetch that many rows (e.g. homepage featured strip).
 */
export async function getPublishedCourseListItemsFromDatabase(options?: {
  limit?: number;
}): Promise<CourseListItem[]> {
  if (isBuildPhase() || !process.env.DATABASE_URL?.trim()) {
    return [];
  }

  const rows = await prisma.lmsCourse.findMany({
    where: publishedWhere,
    orderBy: { updatedAt: 'desc' },
    ...(options?.limit != null ? { take: options.limit } : {}),
    include: publicListInclude,
  });

  return rows.map(mapLmsCourseToPublicListItem);
}

/**
 * Single published course for `/courses/[slug]` (same source of truth as the index when using Prisma).
 */
export async function getPublishedCourseDetailBySlugFromDatabase(slug: string) {
  const target = decodeURIComponent(slug).trim();
  if (!target) return null;

  const row = await prisma.lmsCourse.findFirst({
    where: {
      ...publishedWhere,
      slug: { equals: target, mode: 'insensitive' },
    },
    include: {
      instructor: { select: { fullName: true } },
      _count: { select: { modules: true } },
    },
  });

  if (!row) return null;

  const priceNum = Number(row.priceAud);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? null,
    short_description: row.shortDescription ?? null,
    price_aud: String(priceNum),
    is_free: row.isFree || priceNum === 0,
    level: row.level ?? null,
    category: row.category ?? null,
    iicrc_discipline: row.iicrcDiscipline ?? null,
    cec_hours: cecHoursLabelForRow({
      slug: row.slug,
      cecHours: row.cecHours,
      shortDescription: row.shortDescription,
      description: row.description,
      meta: row.meta,
      durationHours: row.durationHours,
      iicrcDiscipline: row.iicrcDiscipline,
    }),
    duration_hours: row.durationHours != null ? String(row.durationHours) : null,
    thumbnail_url: normalizePublicAssetUrl(row.thumbnailUrl),
    module_count: row._count.modules,
    instructor: row.instructor?.fullName ? { full_name: row.instructor.fullName } : null,
  };
}

/**
 * Stripe/checkout line item metadata from the published LMS catalogue.
 */
export async function getPublishedCourseForCheckout(
  slug: string
): Promise<CheckoutCourse | null> {
  if (isBuildPhase() || !process.env.DATABASE_URL?.trim()) return null;
  const target = decodeURIComponent(slug).trim();
  if (!target) return null;

  const row = await prisma.lmsCourse.findFirst({
    where: {
      ...publishedWhere,
      slug: { equals: target, mode: 'insensitive' },
    },
  });
  if (!row) return null;

  const priceNum = Number(row.priceAud);
  const isFree = row.isFree === true || !Number.isFinite(priceNum) || priceNum <= 0;

  return {
    slug: row.slug,
    title: row.title,
    short_description: row.shortDescription ?? undefined,
    price_aud: isFree ? 0 : priceNum,
    is_free: isFree,
  };
}

/** Published course slugs for sitemap generation. */
export async function getPublishedCourseSlugsFromDatabase(): Promise<
  Array<{ slug: string; updated_at: string }>
> {
  if (isBuildPhase() || !process.env.DATABASE_URL?.trim()) return [];

  const rows = await prisma.lmsCourse.findMany({
    where: publishedWhere,
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  return rows.map((row) => ({
    slug: row.slug,
    updated_at: row.updatedAt.toISOString(),
  }));
}
