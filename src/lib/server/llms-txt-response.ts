import type { CourseListItem } from '@/lib/course-list-item';
import { INDIVIDUAL_TIERS } from '@/lib/lms/pricing-tiers';
import {
  allowsFreeEntryRegistration,
  ccwRoadshowEvents,
  type CcwRoadshowEvent,
} from '@/lib/marketing/ccw-roadshow';
import { selectCurrentCecCourses } from '@/lib/seed/cec-approvals';
import { buildLlmsTxt } from '@/lib/seo/llms-txt';
import { hasPublicCoursePage } from '@/lib/seo/public-course-page';
import { minPaidCoursePrice } from '@/lib/server/public-catalogue-facts';

export type LlmsCatalogueRead = {
  /** Published courses as /courses lists them. */
  items: CourseListItem[];
  /** Independent count of published courses, to detect a truncated or partial read. */
  count: number;
};

export type LlmsTxtDeps = {
  readCatalogue: () => Promise<LlmsCatalogueRead>;
  subscriptionsEnabled: () => boolean;
  now?: Date;
  /** Defaults to the roadshow events in src/lib/marketing/ccw-roadshow.ts. */
  events?: readonly CcwRoadshowEvent[];
};

/** Longest a shared cache may hold a 200, in seconds. */
export const LLMS_MAX_CACHE_SECONDS = 300;

/**
 * Cache-Control for a 200. The text lists CEC hours that stop being true when an approval
 * expires, and events that stop being upcoming when they end, so a cached copy must never
 * outlive the soonest of those. No stale-while-revalidate: a stale copy is exactly the
 * outdated claim this bounds. Too close to call → no-store.
 */
export function llmsCacheControl(now: Date, boundaries: Date[]): string {
  const soonest = boundaries.reduce<number>(
    (min, d) => Math.min(min, Math.floor((d.getTime() - now.getTime()) / 1000) - 1),
    LLMS_MAX_CACHE_SECONDS
  );
  return soonest >= 1 ? `public, max-age=0, s-maxage=${soonest}` : 'no-store';
}

/** The calendar date as written in the event's own local time (no UTC shift). */
function isoDay(iso: string): string {
  return iso.slice(0, 10);
}

const UNAVAILABLE_BODY =
  'llms.txt is temporarily unavailable because the CARSI course catalogue could not be read. Try again shortly, or see https://carsi.com.au/courses.\n';

function unavailable(): Response {
  // Never serve a partial or empty catalogue as if it were the real one.
  return new Response(UNAVAILABLE_BODY, {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Retry-After': '300',
      'Cache-Control': 'no-store',
    },
  });
}

function isFree(course: CourseListItem): boolean {
  return Boolean(course.is_free) || Number(course.price_aud) === 0;
}

/** /llms.txt from live sources; 503 when the catalogue read fails, is empty or is partial. */
export async function llmsTxtResponse(deps: LlmsTxtDeps): Promise<Response> {
  let read: LlmsCatalogueRead;
  try {
    read = await deps.readCatalogue();
  } catch (error) {
    console.error('[llms.txt] catalogue read failed', error);
    return unavailable();
  }
  if (read.items.length === 0 || read.items.length !== read.count) return unavailable();

  const now = deps.now ?? new Date();
  const publicCourses = read.items
    .filter(hasPublicCoursePage)
    .sort((a, b) => a.title.localeCompare(b.title, 'en-AU'));
  const membership = INDIVIDUAL_TIERS.find((t) => t.id === 'pro_annual');
  if (!membership?.priceCents) return unavailable();

  const cecCourses = selectCurrentCecCourses(publicCourses, now).map(
    ({ course, approvedHours, expiresAt }) => ({
      slug: course.slug,
      title: course.title,
      approvedHours,
      expiresAt,
    })
  );
  // Only events that have not ended; past dates are never presented as current.
  const upcoming = (deps.events ?? ccwRoadshowEvents)
    .filter((e) => new Date(e.endDateIso).getTime() > now.getTime())
    .sort((a, b) => a.startDateIso.localeCompare(b.startDateIso));

  const text = buildLlmsTxt({
    courses: publicCourses.map((c) => ({ slug: c.slug, title: c.title })),
    onboardingProgramCount: read.items.length - publicCourses.length,
    freeCourseCount: publicCourses.filter(isFree).length,
    minPaidCoursePriceAud: minPaidCoursePrice(publicCourses),
    membership: {
      priceCents: membership.priceCents,
      available: deps.subscriptionsEnabled(),
      terms: membership.description,
    },
    cecCourses,
    events: upcoming.map((e) => ({
      title: e.title,
      venue: `${e.venueName}, ${e.suburbStatePostcode}`,
      startDate: isoDay(e.startDateIso),
      endDate: isoDay(e.endDateIso),
      registration: allowsFreeEntryRegistration(e) ? 'free-token' : 'external',
    })),
    generatedAt: now,
  });

  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': llmsCacheControl(now, [
        ...cecCourses.map((c) => new Date(c.expiresAt)),
        ...upcoming.map((e) => new Date(e.endDateIso)),
      ]),
    },
  });
}
