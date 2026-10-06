import { NextResponse, type NextRequest } from 'next/server';

/**
 * Course slugs renamed because they carried an IICRC discipline designation, as an acronym or
 * written out in full. CARSI courses are never branded with IICRC designations (CLAUDE.md §
 * CARSI designation rule; BACKLOG #31, DECISIONS #15). Old -> new.
 *
 * The live database rename is a separate, founder-approved data edit. Until it runs, the old
 * slug is still the real course and must keep serving; after it runs, the old slug no longer
 * exists. So the redirect is decided by the DATABASE, not by a static rule: an old slug is
 * redirected only once the old row is gone AND the new row exists. That makes this code safe to
 * deploy before, after or without the data edit — no old URL 404s, and no redirect ever points
 * at a slug that does not exist yet.
 */
export const RENAMED_COURSE_SLUGS: Readonly<Record<string, string>> = {
  'wrt-water-damage-essentials': 'water-damage-essentials',
  'asd-structural-drying-core': 'structural-drying-core',
  'fsrt-fire-smoke-restoration-core': 'fire-smoke-restoration-core',
  'cct-commercial-carpet-core': 'commercial-carpet-core',
  'introduction-to-advanced-applied-structural-drying': 'introduction-to-advanced-structural-drying',
  // Renamed in the seed but not in the live catalogue on 06/10/2026 (public API 404 for both
  // names). Mapped anyway: the redirect only fires once the old row is gone and the new row
  // exists, so it is inert until a database actually holds the new slug.
  'amrt-microbial-remediation-core': 'microbial-remediation-core',
  'carpet-cleaning-technician-fundamentals': 'carpet-cleaning-fundamentals',
};

/** The renamed slug for `slug`, or null when it was never renamed. */
export function renamedCourseSlug(slug: string): string | null {
  const key = slug.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(RENAMED_COURSE_SLUGS, key)
    ? RENAMED_COURSE_SLUGS[key]
    : null;
}

/**
 * What the database holds under a slug: a published course, a course in any other state, or
 * nothing. null when it could not be asked.
 */
export type CourseSlugState = 'published' | 'unpublished' | 'absent';
export type LookupCourseSlug = (slug: string) => Promise<CourseSlugState | null>;

/** Page routes keyed on a course slug. API routes are excluded by the proxy matcher. */
const COURSE_PATH = /^\/(courses|dashboard\/courses|dashboard\/learn)\/([^/]+)(\/.*)?$/;

/**
 * A real HTTP 301 for a renamed course slug, or null to let the request through untouched.
 * Runs in the proxy, before rendering: a redirect thrown from a streamed page reaches the
 * browser as a 200 with a meta refresh, which is not a permanent redirect to a crawler.
 * It redirects only when no row (in any state) holds the old slug AND the new slug is a
 * PUBLISHED course — the same visibility the destination page renders — so a 301 never points at
 * a 404 (independent review, 06/10/2026). Any doubt (no database, a query error, any other
 * state) serves the request exactly as before.
 */
export async function renamedCourseRedirect(
  request: NextRequest,
  lookup: LookupCourseSlug
): Promise<NextResponse | null> {
  const match = COURSE_PATH.exec(request.nextUrl.pathname);
  if (!match) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  const to = renamedCourseSlug(slug);
  if (!to) return null;
  if ((await lookup(slug.trim().toLowerCase())) !== 'absent') return null;
  if ((await lookup(to)) !== 'published') return null;
  const url = request.nextUrl.clone();
  url.pathname = `/${match[1]}/${to}${match[3] ?? ''}`;
  return NextResponse.redirect(url, 301);
}

/**
 * Production lookup. Matches the slug case-insensitively and uses the public catalogue's own
 * published predicate, exactly as the course detail page does.
 */
export const lookupCourseSlugInDatabase: LookupCourseSlug = async (slug) => {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    const { prisma } = await import('@/lib/prisma');
    const { lmsPublishedCourseWhere } = await import('@/lib/server/public-courses-list');
    const bySlug = { slug: { equals: slug, mode: 'insensitive' as const } };
    const any = await prisma.lmsCourse.findFirst({ where: bySlug, select: { id: true } });
    if (!any) return 'absent';
    const published = await prisma.lmsCourse.findFirst({
      where: { ...lmsPublishedCourseWhere, ...bySlug },
      select: { id: true },
    });
    return published ? 'published' : 'unpublished';
  } catch {
    return null;
  }
};
