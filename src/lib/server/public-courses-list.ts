import { normalizePublicAssetUrl } from '@/lib/remote-image';
import type { CourseListItem, WpExportCourse } from '@/lib/wordpress-export-courses';
import { prisma } from '@/lib/prisma';

const publishedWhere = {
  OR: [
    { isPublished: true },
    { status: { equals: 'published', mode: 'insensitive' as const } },
  ],
};

const draftWhere = {
  status: { equals: 'draft', mode: 'insensitive' as const },
};

export type DashboardCourseStatusFilter = 'all' | 'draft' | 'published';

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
  };
}

/**
 * Full LMS catalogue for `/dashboard/courses`: optional draft / published / all,
 * with module counts. Draft-only lists are ordered by most modules first.
 */
export async function getDashboardCourseListItemsFromDatabase(options: {
  status: DashboardCourseStatusFilter;
}): Promise<CourseListItem[]> {
  if (!process.env.DATABASE_URL?.trim()) {
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

/**
 * Published catalogue rows for `/courses` and other public listings.
 * Matches the `CourseListItem` shape used by `CourseGrid` / `CourseCard`.
 *
 * @param options.limit — when set, only fetch that many rows (e.g. homepage featured strip).
 */
export async function getPublishedCourseListItemsFromDatabase(options?: {
  limit?: number;
}): Promise<CourseListItem[]> {
  const rows = await prisma.lmsCourse.findMany({
    where: publishedWhere,
    orderBy: { updatedAt: 'desc' },
    ...(options?.limit != null ? { take: options.limit } : {}),
  });

  return rows.map((c) => ({
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
  }));
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
    cec_hours: row.cecHours != null ? String(row.cecHours) : null,
    duration_hours: row.durationHours != null ? String(row.durationHours) : null,
    thumbnail_url: normalizePublicAssetUrl(row.thumbnailUrl),
    instructor: row.instructor?.fullName ? { full_name: row.instructor.fullName } : null,
  };
}

/**
 * Stripe/checkout line item metadata: same published course as the catalogue when using Prisma.
 * Shaped like a WP export row so `createStripeCheckoutForCourse` can stay unchanged.
 */
export async function getPublishedCourseAsWpExportForCheckout(slug: string): Promise<WpExportCourse | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
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
    wp_id: 0,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    short_description: row.shortDescription ?? undefined,
    thumbnail_url: normalizePublicAssetUrl(row.thumbnailUrl),
    price_aud: isFree ? 0 : priceNum,
    is_free: isFree,
    iicrc_discipline: row.iicrcDiscipline,
    status: row.status,
    level: row.level,
    category: row.category,
  };
}
