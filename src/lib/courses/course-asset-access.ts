/**
 * Who may fetch a file under `public/courses/<folder>/...` (GP-730).
 *
 * Next.js serves `public/` as static files, so a draft course's field tools and diagrams were
 * reachable by anyone with the exact address before the course was published. The proxy now
 * asks this module first: a course file is served only when its folder belongs to a course that
 * the catalogue (`data/seed/courses-catalog.json`, the SSOT) marks as published, i.e.
 * `status === 'published'` AND `isPublished === true` (the same pair the course routes gate on).
 *
 * Fail-closed: a folder with no catalogue course, a draft, an archived course, an undecodable
 * address or a path with `.`/`..` segments is refused. Publishing a course in the catalogue is
 * the only step that opens its files; there is no hand list of allowed folders.
 */
import catalog from '../../../data/seed/courses-catalog.json';

type CatalogPublicationFields = { slug: string; status?: string | null; isPublished?: boolean | null };

/**
 * Asset folders whose name differs from the catalogue slug of the course they belong to.
 * This maps a folder to its course; it does not decide access. The course's catalogue status
 * still does.
 */
export const COURSE_ASSET_FOLDER_ALIASES: Readonly<Record<string, string>> = {
  // Course pack linked from /ccw-truckmount-operations (src/lib/ccw/truckmount-course.ts).
  'ccw-carsi-truckmount': 'ccw-carsi-truckmount-operations',
};

export function isPublishedCatalogCourse(course: CatalogPublicationFields): boolean {
  return course.status === 'published' && course.isPublished === true;
}

/** Slugs of the courses the catalogue marks as published. */
export function publishedCatalogSlugs(
  courses: readonly CatalogPublicationFields[]
): ReadonlySet<string> {
  return new Set(courses.filter(isPublishedCatalogCourse).map((c) => c.slug));
}

const CATALOG_PUBLISHED_SLUGS = publishedCatalogSlugs(
  (catalog as { courses: CatalogPublicationFields[] }).courses
);

/**
 * The asset folder a request path names, or null when the path is not a course file.
 * A course file is `/courses/<folder>/<...>/<name>.<ext>`: at least one segment after the folder,
 * the last one carrying an extension. `/courses/<slug>` and `/courses/<slug>/payment-success`
 * are pages, not files, and return null. Returns `''` (refuse) when the path cannot be read
 * safely: bad percent-encoding, or a `.`/`..`/backslash segment.
 */
export function courseAssetFolder(pathname: string): string | null {
  const raw = pathname.split('/').filter((s) => s.length > 0);
  if (raw[0] !== 'courses' || raw.length < 3) return null;
  let segments: string[];
  try {
    segments = raw.map((s) => decodeURIComponent(s));
  } catch {
    return '';
  }
  if (segments.some((s) => s === '.' || s === '..' || s.includes('/') || s.includes('\\'))) {
    return '';
  }
  const last = segments[segments.length - 1];
  if (!/\.[^./]+$/.test(last)) return null;
  return segments[1];
}

/** True when the course owning `folder` is published in the catalogue. */
export function isCourseAssetFolderPublished(
  folder: string,
  published: ReadonlySet<string> = CATALOG_PUBLISHED_SLUGS
): boolean {
  if (!folder) return false;
  const slug = Object.prototype.hasOwnProperty.call(COURSE_ASSET_FOLDER_ALIASES, folder)
    ? COURSE_ASSET_FOLDER_ALIASES[folder]
    : folder;
  return published.has(slug);
}

export type CourseAssetDecision = 'not-a-course-asset' | 'serve' | 'refuse';

export function courseAssetDecision(
  pathname: string,
  published: ReadonlySet<string> = CATALOG_PUBLISHED_SLUGS
): CourseAssetDecision {
  const folder = courseAssetFolder(pathname);
  if (folder === null) return 'not-a-course-asset';
  return isCourseAssetFolderPublished(folder, published) ? 'serve' : 'refuse';
}
