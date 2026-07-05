/** Shared shape for home featured cards and `CourseGrid` (structural match). */
export type CourseListItem = {
  id: string;
  slug: string;
  title: string;
  short_description?: string | null;
  price_aud: number | string;
  is_free?: boolean;
  discipline?: string | null;
  thumbnail_url?: string | null;
  level?: string | null;
  category?: string | null;
  lesson_count?: number | null;
  /** LMS row status when loaded from Prisma (dashboard catalogue). */
  catalog_status?: 'draft' | 'published' | string | null;
  /** Number of modules (LMS curriculum); used for dashboard sorting. */
  module_count?: number | null;
  updated_at?: string | null;
  instructor?: { full_name: string } | null;
  /** IICRC CEC hours when known (from LMS database). */
  cec_hours?: string | null;
  /** Estimated or published duration hours. */
  duration_hours?: string | null;
  /** Free-text keyword tags (LMS `tags` JSON column); used for catalogue tag filtering. */
  tags?: string[] | null;
};

/** Normalises the Prisma `tags` JSON column (array of strings, or null/malformed) to a clean string array. */
export function normalizeCourseTags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const tags = raw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : null;
}

/** Minimal published course row for Stripe checkout. */
export type CheckoutCourse = {
  slug: string;
  title: string;
  short_description?: string | null;
  price_aud: number;
  is_free?: boolean;
};
