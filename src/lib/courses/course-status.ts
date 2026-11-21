/**
 * The one in-memory answer to "is this course published?" (#137: `status` is canonical;
 * `isPublished` is a legacy dual-write column). Dependency-free so the proxy (GP-730) can use
 * it without loading the database client; `public-courses-list` re-exports it beside the
 * Prisma filter it must agree with.
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
