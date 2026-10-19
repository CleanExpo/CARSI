/**
 * Old WordPress URLs that sister sites still link to, sent to the matching page on today's site.
 *
 * On 19/10/2026 each of these 404'd on carsi.com.au (curl -L) while Disaster Recovery linked
 * them: six /product/ courses from its minimum-training and hazmat pages, and /membership/ from
 * its contractor onboarding ("Subscribe to CARSI"). Each course mapping is evidenced: the
 * WordPress product's title (data/wordpress-export/courses.json) is identical to the live course
 * page title at the destination. A /product/ URL with no evidenced match goes to the catalogue,
 * never to a guessed course. Static 301s: these WordPress URLs can never come back, so unlike
 * src/lib/seo/renamed-course-slugs.ts there is no database condition to wait for.
 *
 * Consumed by next.config.ts redirects(). Specific rules first; the /product/ catch-all last.
 * A legacy URL with a trailing slash takes two hops: Next's own 308 to the slashless path, then
 * this 301.
 */

export interface LegacyRedirect {
  source: string;
  destination: string;
  statusCode: 301;
  /** Next accepts statusCode OR permanent, never both; permanent would also mean 308, not 301. */
  permanent?: never;
}

const PRODUCT_TO_COURSE: ReadonlyArray<[wpSlug: string, courseSlug: string]> = [
  ['safety-procedures', 'introduction-to-safety-procedures-for-water-damage-work'],
  ['risk-assessment-course', 'risk-assessment-course'],
  ['safe-work-method-statements-swms-course', 'safe-work-method-statements-swms-course'],
  ['safety-data-sheet-sds-course', 'safety-data-sheet-sds-course'],
  ['standard-operating-procedures-sop-course', 'standard-operating-procedures-sop-course'],
  ['asbestos', 'introduction-to-asbestos-asbestos-awareness'],
];

export const LEGACY_WORDPRESS_REDIRECTS: readonly LegacyRedirect[] = [
  ...PRODUCT_TO_COURSE.map(([wp, course]) => ({
    source: `/product/${wp}`,
    destination: `/courses/${course}`,
    statusCode: 301 as const,
  })),
  { source: '/membership', destination: '/subscribe', statusCode: 301 },
  { source: '/product/:slug*', destination: '/courses', statusCode: 301 },
];

/**
 * Destinations that would redirect again: a config redirect source, a renamed course slug the
 * proxy 301s (src/lib/seo/renamed-course-slugs.ts), or a trailing slash Next 308s. Each adds a
 * hop or a loop, so for the real table this must return nothing.
 */
export function findRedirectChains(
  table: readonly { destination: string }[],
  matchesConfigSource: (path: string) => boolean,
  renamedCourseSlugs: Readonly<Record<string, string>>
): string[] {
  const problems: string[] = [];
  for (const { destination } of table) {
    if (destination.length > 1 && destination.endsWith('/')) {
      problems.push(`${destination}: trailing slash`);
    }
    if (matchesConfigSource(destination)) problems.push(`${destination}: matches a config redirect`);
    const course = /^\/courses\/([^/]+)$/.exec(destination)?.[1];
    if (course && Object.prototype.hasOwnProperty.call(renamedCourseSlugs, course)) {
      problems.push(`${destination}: a renamed course slug the proxy redirects again`);
    }
  }
  return problems;
}
