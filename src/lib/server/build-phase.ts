/**
 * True during `next build` static generation, when external data sources
 * (the database and the backend API) are not reachable.
 *
 * Public catalogue pages short-circuit their data fetches with this so they can
 * prerender instantly at build time (returning the same empty/fallback data they
 * already use when `DATABASE_URL` is unset) and then hydrate real data at runtime
 * via ISR. Without this, removing `force-dynamic` makes the build hang on a DB/API
 * call that never resolves (issue #129).
 *
 * Next.js sets `NEXT_PHASE` to `phase-production-build` for the duration of the
 * production build only; it is unset at runtime.
 */
export function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}
