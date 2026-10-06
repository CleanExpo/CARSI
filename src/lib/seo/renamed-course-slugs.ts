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

/** true / false when the database answered; null when it could not be asked. */
export type CourseSlugExists = (slug: string) => Promise<boolean | null>;

/** Page routes keyed on a course slug. API routes are excluded by the proxy matcher. */
const COURSE_PATH = /^\/(courses|dashboard\/courses|dashboard\/learn)\/([^/]+)(\/.*)?$/;

/**
 * A real HTTP 301 for a renamed course slug, or null to let the request through untouched.
 * Runs in the proxy, before rendering: a redirect thrown from a streamed page reaches the
 * browser as a 200 with a meta refresh, which is not a permanent redirect to a crawler.
 * Any doubt (no database, a query error, either row in an unexpected state) serves the request
 * exactly as before.
 */
export async function renamedCourseRedirect(
  request: NextRequest,
  courseSlugExists: CourseSlugExists
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
  if ((await courseSlugExists(slug.trim().toLowerCase())) !== false) return null;
  if ((await courseSlugExists(to)) !== true) return null;
  const url = request.nextUrl.clone();
  url.pathname = `/${match[1]}/${to}${match[3] ?? ''}`;
  return NextResponse.redirect(url, 301);
}

/** Production lookup: does any course row (published or not) hold this slug? */
export const courseSlugExistsInDatabase: CourseSlugExists = async (slug) => {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    const { prisma } = await import('@/lib/prisma');
    const row = await prisma.lmsCourse.findUnique({ where: { slug }, select: { id: true } });
    return row !== null;
  } catch {
    return null;
  }
};
