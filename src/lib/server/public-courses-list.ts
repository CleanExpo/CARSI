import { normalizePublicAssetUrl } from '@/lib/remote-image';
import type { CourseListItem, WpExportCourse } from '@/lib/wordpress-export-courses';
import { prisma } from '@/lib/prisma';

const publishedWhere = {
  OR: [
    { isPublished: true },
    { status: { equals: 'published', mode: 'insensitive' as const } },
  ],
};

const courseListInclude = {
  instructor: { select: { fullName: true } },
  modules: {
    select: {
      _count: { select: { lessons: true } },
    },
  },
} as const;

type CourseListRow = Awaited<
  ReturnType<
    typeof prisma.lmsCourse.findMany<{ where: typeof publishedWhere; include: typeof courseListInclude }>
  >
>[number];

function mapCourseRowToListItem(c: CourseListRow): CourseListItem {
  const lessonCount = c.modules.reduce((acc, m) => acc + m._count.lessons, 0);
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
    lesson_count: lessonCount,
    updated_at: c.updatedAt.toISOString(),
    instructor: c.instructor?.fullName ? { full_name: c.instructor.fullName } : null,
  };
}

/**
 * Homepage “Popular Courses”: first `limit` published rows by catalogue insertion order.
 */
export async function getFeaturedCourseListItemsFromDatabase(
  limit = 3
): Promise<CourseListItem[]> {
  const rows = await prisma.lmsCourse.findMany({
    where: publishedWhere,
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: courseListInclude,
  });
  return rows.map(mapCourseRowToListItem);
}

/**
 * Published catalogue rows for `/courses` and other public listings.
 * Matches the `CourseListItem` shape used by `CourseGrid` / `CourseCard`.
 */
export async function getPublishedCourseListItemsFromDatabase(): Promise<CourseListItem[]> {
  const rows = await prisma.lmsCourse.findMany({
    where: publishedWhere,
    orderBy: { updatedAt: 'desc' },
    include: courseListInclude,
  });

  return rows.map(mapCourseRowToListItem);
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
