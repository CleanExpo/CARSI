import type { Prisma } from '@/generated/prisma/client';
import { normalizeCourseTags, type CheckoutCourse, type CourseListItem } from '@/lib/course-list-item';
import { prisma } from '@/lib/prisma';
import { normalizePublicAssetUrl } from '@/lib/remote-image';
import { isBuildPhase } from '@/lib/server/build-phase';
import { formatLmsCourseCecHoursLabel } from '@/lib/server/course-cec-hours';
import { formatLmsCourseDurationHoursLabel } from '@/lib/server/course-duration-hours';

/**
 * Same filter as the public `/courses` catalogue when loaded from Prisma.
 *
 * `status` is the canonical publication flag (#137). The legacy `isPublished` boolean is
 * retained as a dual-write column for one sprint but is no longer read here — the
 * `137-canonicalize-course-status` migration backfills `status='published'` for every row
 * the old `isPublished OR status` predicate counted as published, so this narrowing is
 * non-regressing. That migration MUST be applied to prod before this code ships.
 */
export const lmsPublishedCourseWhere: Prisma.LmsCourseWhereInput = {
  status: { equals: 'published', mode: 'insensitive' },
};

/**
 * The same predicate, for rows already in memory.
 *
 * Defined here, immediately beside the Prisma filter, so the database question and the
 * in-memory question can never answer differently. Callers that fetched a course through a
 * relation (a pathway's ordered courses, for instance) must use this rather than reading the
 * legacy `isPublished` column — doing that split the product in two: 20 courses currently carry
 * status='published' with isPublished=false, so they were enrollable from the public catalogue
 * and simultaneously invisible in pathways and team assignment.
 */
export function isPublishedCourseStatus(status: string | null | undefined): boolean {
  // Deliberately NOT trimmed. Prisma's `equals: 'published', mode: 'insensitive'` does not
  // trim either, and the whole point of this predicate is to give the same answer as the
  // database. Trimming here made '  published  ' visible in pathway and team filters while
  // the catalogue, checkout and team queries excluded the same row — the split-brain this
  // function exists to close, reintroduced one layer up. `status` is an unconstrained
  // String column, so the padded value is allowed even though no seed row currently uses it.
  return typeof status === 'string' && status.toLowerCase() === 'published';
}

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
    // Registry-only (GP-498): stored `cecHours` is WP-import pollution; the label resolves
    // solely from the approvals registry by slug, so the raw column is not read here.
    cecHours: null,
    shortDescription: c.shortDescription,
    description: c.description,
    meta: c.meta,
    durationHours: c.durationHours,
    iicrcDiscipline: c.iicrcDiscipline,
  });
}

function durationHoursLabelForRow(c: {
  slug: string;
  durationHours: number | null;
  shortDescription?: string | null;
  description?: string | null;
}): string | null {
  return formatLmsCourseDurationHoursLabel({
    slug: c.slug,
    durationHours: c.durationHours,
    shortDescription: c.shortDescription,
    description: c.description,
  });
}

function mapDashboardCourseRow(c: {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description?: string | null;
  priceAud: { toString(): string };
  isFree: boolean;
  iicrcDiscipline: string | null;
  thumbnailUrl: string | null;
  level: string | null;
  category: string | null;
  tags?: unknown;
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
    tags: normalizeCourseTags(c.tags),
    lesson_count: null,
    updated_at: c.updatedAt.toISOString(),
    instructor: null,
    catalog_status: st === 'draft' ? 'draft' : 'published',
    module_count: c._count.modules,
    cec_hours: cecHoursLabelForRow(c),
    duration_hours: durationHoursLabelForRow(c),
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
  tags?: unknown;
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
    tags: normalizeCourseTags(c.tags),
    lesson_count: null,
    module_count: c._count.modules,
    updated_at: c.updatedAt.toISOString(),
    instructor: c.instructor?.fullName ? { full_name: c.instructor.fullName } : null,
    cec_hours: cecHoursLabelForRow(c),
    duration_hours: durationHoursLabelForRow(c),
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
/**
 * Total a module's runtime ONLY when every lesson in it carries a real duration.
 *
 * A partial sum is the dangerous case: it renders as "Module 2 — 12 min" while silently
 * omitting the lessons nobody has timed, so it reads as authoritative and is wrong. Absent
 * data must look absent. Returns null for an empty module, a module with no timings, and a
 * module that is only partly timed.
 */
/** Syllabus fetch bounds — CARSI_VERIFICATION_GATE.md rule 2 (bounded queries). */
const SYLLABUS_MODULE_CAP = 60;
const SYLLABUS_LESSON_CAP = 100;

/**
 * The body a logged-out visitor is allowed to read for one lesson.
 *
 * Returns the body ONLY for a lesson explicitly flagged as a preview. Every other lesson
 * returns null, whatever its content holds. This runs server-side and is the single decision
 * point — paid lesson content must never depend on a client-side condition to stay private.
 */
export function previewBodyFor(lesson: {
  isPreview: boolean;
  contentBody: string | null;
}): string | null {
  if (!lesson.isPreview) return null;
  return lesson.contentBody ?? null;
}

export function summariseModuleDuration(
  lessons: { durationMinutes: number | null }[]
): number | null {
  if (lessons.length === 0) return null;
  if (!lessons.every((l) => typeof l.durationMinutes === 'number')) return null;
  return lessons.reduce((n, l) => n + (l.durationMinutes ?? 0), 0);
}

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
      modules: {
        orderBy: { orderIndex: 'asc' },
        // Bounded per CARSI_VERIFICATION_GATE.md rule 2 — a syllabus grows with the course and
        // an unbounded nested fetch is a latency time-bomb. The largest live course is well
        // inside these caps; a course exceeding them renders a truncated syllabus rather than
        // pulling an unbounded tree on every public page view.
        take: SYLLABUS_MODULE_CAP,
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { orderIndex: 'asc' },
            take: SYLLABUS_LESSON_CAP,
            select: {
              id: true,
              title: true,
              contentType: true,
              isPreview: true,
              durationMinutes: true,
              // contentBody is deliberately NOT selected here. Fetching every lesson's full text
              // on every public page view — then discarding all but the preview in JS — pulled
              // paid content out of the database for no reason. The preview body is fetched
              // separately below, bounded to the single lesson actually shown.
            },
          },
        },
      },
    },
  });

  if (!row) return null;

  // Fetch the body of the ONE preview lesson actually rendered, rather than every lesson's body.
  // Bounded by construction: a single row, looked up by id, and re-checked on isPreview at the
  // database so the guarantee does not rest on the in-memory scan that chose the id.
  const previewLessonId =
    row.modules.flatMap((m) => m.lessons).find((l) => l.isPreview)?.id ?? null;
  const previewLesson = previewLessonId
    ? await prisma.lmsLesson.findFirst({
        where: { id: previewLessonId, isPreview: true },
        select: { id: true, contentBody: true },
      })
    : null;

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
      cecHours: null,
      shortDescription: row.shortDescription,
      description: row.description,
      meta: row.meta,
      durationHours: row.durationHours,
      iicrcDiscipline: row.iicrcDiscipline,
    }),
    duration_hours: durationHoursLabelForRow({
      slug: row.slug,
      durationHours: row.durationHours,
      shortDescription: row.shortDescription,
      description: row.description,
    }),
    thumbnail_url: normalizePublicAssetUrl(row.thumbnailUrl),
    module_count: row._count.modules,
    // The bare module COUNT was the only curriculum signal this page had. Buyers comparing
    // against a named syllabus cannot tell what two hours actually contains, so surface the
    // real module and lesson titles the LMS already stores.
    lesson_count: row.modules.reduce((n, m) => n + m.lessons.length, 0),
    syllabus: row.modules.map((m) => {
      return {
        id: m.id,
        title: m.title,
        duration_minutes: summariseModuleDuration(m.lessons),
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          content_type: l.contentType,
          is_preview: l.isPreview,
          duration_minutes: l.durationMinutes ?? null,
          // Hard strip. A body survives to the public page ONLY on a lesson explicitly flagged
          // isPreview, on a course already filtered to published. Everything else is nulled here,
          // server-side, so no client-side condition can be the thing protecting paid content.
          preview_body:
            previewLesson && previewLesson.id === l.id
              ? previewBodyFor({ isPreview: l.isPreview, contentBody: previewLesson.contentBody })
              : null,
        })),
      };
    }),
    instructor: row.instructor?.fullName ? { full_name: row.instructor.fullName } : null,
    intro_video_url: readIntroVideoUrlFromMeta(row.meta),
  };
}

/**
 * The admin editor stores the course intro/marketing video under `meta.introVideoUrl`
 * (see admin-courses-service). Surface it to the public course page so it can render a
 * hero player and emit VideoObject JSON-LD (video rich results + GEO). Returns null unless
 * a non-empty string URL is present.
 */
function readIntroVideoUrlFromMeta(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const value = (meta as Record<string, unknown>).introVideoUrl;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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
