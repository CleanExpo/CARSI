/**
 * JSON shape for `data/seed/courses-catalog.json`.
 * Produced by `scripts/export-courses-catalog.ts` and consumed by `scripts/seed-courses-catalog.ts`.
 */
export const COURSES_CATALOG_VERSION = 1 as const;

export type CatalogInstructor = {
  id: string;
  email: string;
  fullName: string | null;
};

export type CatalogLesson = {
  id: string;
  title: string;
  contentType: string;
  contentBody: string | null;
  orderIndex: number;
  isPreview: boolean;
  resources: unknown;
};

export type CatalogModule = {
  id: string;
  title: string;
  orderIndex: number;
  lessons: CatalogLesson[];
};

/**
 * Prerequisite fields a course may carry in `meta` (DECISIONS #41). `meta` stays `unknown`
 * because it is a free-form bag; the gate parses it defensively with
 * `parseCoursePrerequisites` (`src/lib/lms/course-prerequisites.ts`), which also honours the
 * legacy singular `prerequisite` slug. Enforced server-side at enrolment, checkout and
 * lesson/quiz/assessment access.
 */
export type CatalogCoursePrerequisitesMeta = {
  prerequisites?: { courseSlug: string; reason?: string }[];
  /** Legacy single prerequisite slug. */
  prerequisite?: string;
  /** ISO date: enrolments created before it are grandfathered at lesson/quiz read time. */
  prerequisitesEnforcedFrom?: string;
};

export type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  instructorId: string;
  status: string;
  /** Decimal string */
  priceAud: string;
  isFree: boolean;
  durationHours: number | null;
  level: string | null;
  category: string | null;
  tags: unknown;
  iicrcDiscipline: string | null;
  cecHours: number | null;
  meta: unknown;
  isPublished: boolean | null;
  modules: CatalogModule[];
};

export type CoursesCatalogFile = {
  version: typeof COURSES_CATALOG_VERSION;
  exportedAt: string;
  /** When true, export included only catalogue-published rows (same rules as public /courses). */
  publishedOnly?: boolean;
  instructors: CatalogInstructor[];
  courses: CatalogCourse[];
};

export function isCoursesCatalogFile(x: unknown): x is CoursesCatalogFile {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    o.version === COURSES_CATALOG_VERSION &&
    typeof o.exportedAt === 'string' &&
    Array.isArray(o.instructors) &&
    Array.isArray(o.courses)
  );
}
