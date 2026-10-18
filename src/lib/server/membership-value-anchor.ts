import { prisma } from '@/lib/prisma';
import { isBuildPhase } from '@/lib/server/build-phase';
import { CATALOGUE_QUERY_CAP, lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';

/**
 * The /subscribe value anchor (V4): what the courses the membership includes cost when bought
 * one at a time. Derived at render time from the published catalogue, never hard-coded, so the
 * figure moves when a price changes or a course is published or withdrawn.
 *
 * Fails closed. When the live catalogue cannot be read (no database, the build-time prerender, a
 * query error, more rows than one bounded read can prove complete, or no paid course at all) this
 * returns null and the page shows no figure. A stale or seed figure would be a false price claim;
 * a missing one is not.
 */
export type PaidCatalogueValue = {
  /** Published courses that are not free and carry a positive price. */
  paidCourseCount: number;
  /** Their prices added together, in whole cents (AUD, GST included). */
  totalCents: number;
};

/**
 * Pure: add up the paid prices. Free courses and non-positive or unreadable prices are skipped,
 * the same rule as `minPaidCoursePrice`, because the membership anchor is about what a buyer
 * would actually pay. Works in cents so 51 prices like $28.97 add up exactly.
 */
export function sumPaidCoursePrices(
  items: Array<{ price_aud?: number | string | null; is_free?: boolean | null }>
): PaidCatalogueValue | null {
  let paidCourseCount = 0;
  let totalCents = 0;
  for (const item of items) {
    if (item.is_free) continue;
    const price = Number(item.price_aud);
    if (!Number.isFinite(price) || price <= 0) continue;
    paidCourseCount += 1;
    totalCents += Math.round(price * 100);
  }
  return paidCourseCount > 0 ? { paidCourseCount, totalCents } : null;
}

/** "$3,117.90" — the site's AUD price style (GST included). */
export function formatAnchorAud(totalCents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalCents / 100);
}

/** Read the published catalogue and total its paid prices, or null when that cannot be proven. */
export async function getPaidCatalogueValue(): Promise<PaidCatalogueValue | null> {
  if (isBuildPhase() || !process.env.DATABASE_URL?.trim()) return null;
  try {
    // One more than the cap: a full page means the read may be incomplete, and a partial sum
    // would understate the figure while reading as exact.
    const rows = await prisma.lmsCourse.findMany({
      where: lmsPublishedCourseWhere,
      select: { priceAud: true, isFree: true },
      take: CATALOGUE_QUERY_CAP + 1,
    });
    if (rows.length > CATALOGUE_QUERY_CAP) return null;
    return sumPaidCoursePrices(
      rows.map((r) => ({ price_aud: r.priceAud.toString(), is_free: r.isFree }))
    );
  } catch (e) {
    console.error('[membership-value-anchor] catalogue read failed', e);
    return null;
  }
}
