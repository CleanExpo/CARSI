import { cache } from 'react';

import { getBackendOrigin } from '@/lib/env/public-url';
import { isBuildPhase } from '@/lib/server/build-phase';
import type { CourseListItem } from '@/lib/course-list-item';
import { prisma } from '@/lib/prisma';

import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';

export type CatalogueFactsSource = 'database' | 'api' | 'none';

export type PublicCatalogueFacts = {
  /** Number of published courses in the active catalogue source (matches `/courses` listing). */
  publishedCourseCount: number;
  /** Distinct IICRC discipline codes present on those courses (uppercase), sorted. */
  disciplineCodes: string[];
  /**
   * Lowest price (AUD) among published courses that are not free, or null when unknown.
   * Feeds the per-course "From $N" label on /pricing, so it is never a hardcoded figure.
   */
  minPaidCoursePriceAud: number | null;
  /** Where the numbers came from — same resolution order as the course catalogue. */
  source: CatalogueFactsSource;
};

/**
 * Lowest price among paid courses. Free courses and non-positive or unreadable prices are
 * skipped, because "From $0" would advertise a price nobody pays for a paid course.
 */
export function minPaidCoursePrice(
  items: Array<{ price_aud?: number | string | null; is_free?: boolean | null }>
): number | null {
  let min: number | null = null;
  for (const item of items) {
    if (item.is_free) continue;
    const price = Number(item.price_aud);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (min === null || price < min) min = price;
  }
  return min;
}

function collectDisciplineCodes(
  disciplines: Array<string | null | undefined>
): string[] {
  const codes = new Set<string>();
  for (const raw of disciplines) {
    const d = raw?.trim();
    if (d) codes.add(d.toUpperCase());
  }
  return [...codes].sort();
}

/**
 * Derive marketing numbers from the **exact same** course array shown in a listing (e.g. `/courses`
 * grid) so copy and counts cannot drift.
 */
export function deriveCatalogueFactsFromCourseItems(
  items: CourseListItem[],
  source: CatalogueFactsSource = 'none'
): PublicCatalogueFacts {
  return {
    publishedCourseCount: items.length,
    disciplineCodes: collectDisciplineCodes(items.map((i) => i.discipline)),
    minPaidCoursePriceAud: minPaidCoursePrice(items),
    source,
  };
}

async function fetchBackendCatalogueFacts(): Promise<PublicCatalogueFacts | null> {
  const backendUrl = getBackendOrigin();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${backendUrl}/api/lms/courses`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: Array<{
        discipline?: string | null;
        iicrc_discipline?: string | null;
        price_aud?: number | string | null;
        is_free?: boolean | null;
      }>;
      total?: number;
    };
    const items = Array.isArray(data.items) ? data.items : [];
    const total =
      typeof data.total === 'number' && Number.isFinite(data.total) ? data.total : items.length;
    if (total <= 0 && items.length === 0) return null;
    const codes = new Set<string>();
    for (const item of items) {
      const raw = item.discipline ?? item.iicrc_discipline;
      const d = raw != null ? String(raw).trim() : '';
      if (d) codes.add(d.toUpperCase());
    }
    return {
      publishedCourseCount: total > 0 ? total : items.length,
      disciplineCodes: [...codes].sort(),
      minPaidCoursePriceAud: minPaidCoursePrice(items),
      source: 'api',
    };
  } catch {
    return null;
  }
}

/**
 * Published course count and distinct IICRC discipline codes — **same resolution order** as
 * `getCourses()` on `/courses`: Prisma published courses → LMS API.
 *
 * Use `deriveCatalogueFactsFromCourseItems` when you already have the listing array (avoids a
 * second query). For the homepage (no full list), call this directly.
 */
async function computePublicCatalogueFacts(): Promise<PublicCatalogueFacts> {
  // At build time the DB/backend are unreachable; return the empty fallback instantly
  // so ISR pages prerender without hanging, then hydrate real facts at runtime (#129).
  if (isBuildPhase()) {
    return { publishedCourseCount: 0, disciplineCodes: [], minPaidCoursePriceAud: null, source: 'none' };
  }

  if (process.env.DATABASE_URL?.trim()) {
    try {
      const count = await prisma.lmsCourse.count({ where: lmsPublishedCourseWhere });
      if (count > 0) {
        const rows = await prisma.lmsCourse.findMany({
          where: lmsPublishedCourseWhere,
          select: { iicrcDiscipline: true, priceAud: true, isFree: true },
        });
        return {
          publishedCourseCount: count,
          disciplineCodes: collectDisciplineCodes(rows.map((r) => r.iicrcDiscipline)),
          minPaidCoursePriceAud: minPaidCoursePrice(
            rows.map((r) => ({ price_aud: Number(r.priceAud), is_free: r.isFree }))
          ),
          source: 'database',
        };
      }
    } catch (e) {
      console.error('[catalogue-facts] database query failed', e);
    }
  }

  const apiFacts = await fetchBackendCatalogueFacts();
  if (apiFacts) return apiFacts;

  return {
    publishedCourseCount: 0,
    disciplineCodes: [],
    minPaidCoursePriceAud: null,
    source: 'none',
  };
}

/** Dedupes within a single request (e.g. `generateMetadata` + page both need facts). */
export const getPublicCatalogueFacts = cache(computePublicCatalogueFacts);

/** Marketing / SEO: plain count, no inflated “+” unless you add it at the callsite. */
export function formatCourseCountForCopy(n: number): string {
  return String(Math.max(0, Math.floor(n)));
}

/**
 * GP-523 — the public topic list for catalogue selling copy.
 *
 * This deliberately does NOT interpolate `facts.disciplineCodes`. Those are IICRC
 * Registered-Training-School discipline acronyms, and joining them into a sentence about
 * what CARSI offers brands the CARSI catalogue with IICRC disciplines — banned by the
 * CARSI designation rule (CLAUDE.md, founder 2026-07-10). It was also the live defect on
 * `/courses`: the meta description and the FAQPage schema both rendered a bare
 * comma-separated run of stored discipline codes as the list of what CARSI teaches.
 *
 * The plain-English restoration topics say the same thing without the branding, and are
 * constant, so the copy no longer changes with whatever discipline codes happen to be
 * stored on course rows.
 */
const PUBLIC_TOPIC_LIST =
  'water damage restoration, carpet repair, structural drying, mould remediation, fire & smoke restoration, odour control and carpet cleaning';

/**
 * Provider standing, not a course-level CEC claim. A CARSI course may only assert that it
 * earns CECs once the founder records its per-course IICRC approval in
 * `data/seed/cec-approvals.json` (the fail-closed SSOT, currently empty), so catalogue
 * copy states CARSI's accreditation as a CEC provider instead of promising credits.
 */
const PROVIDER_STANDING_SENTENCE = 'Study online with CARSI, an IICRC CEC Accredited provider.';

/**
 * No catalogue-wide accreditation adjective, deliberately.
 *
 * "IICRC CEC Accredited" is a true statement about CARSI's standing as a CEC PROVIDER. Attached
 * to the plural noun and applied across the whole catalogue, it stops describing the provider and
 * starts describing each listed item — an accreditation assertion at the item level. As of
 * 2026-08-18 the approvals registry `data/seed/cec-approvals.json` holds `"approvals": []` and 0
 * of 37 catalogue entries have `cecHours > 0`, so that assertion held for none of them.
 *
 * This is the fail-closed CEC rule applied to marketing copy rather than to a badge: absent by
 * default, added only per course by explicit founder-recorded approval. Do not re-attach the
 * adjective to "courses" here — state provider standing, which is what the sentence below does.
 */
export function catalogueMetaDescription(facts: PublicCatalogueFacts): string {
  const n = facts.publishedCourseCount;
  if (n <= 0) {
    return `Browse restoration and cleaning courses across ${PUBLIC_TOPIC_LIST}. ${PROVIDER_STANDING_SENTENCE}`;
  }
  return `Browse ${n} restoration and cleaning courses across ${PUBLIC_TOPIC_LIST}. ${PROVIDER_STANDING_SENTENCE}`;
}

/** `/courses` index — question-led SEO line without a duplicated “Browse”. */
export function coursesIndexMetaDescription(facts: PublicCatalogueFacts): string {
  const n = facts.publishedCourseCount;
  const core =
    n > 0
      ? `${n} restoration and cleaning courses across ${PUBLIC_TOPIC_LIST}. ${PROVIDER_STANDING_SENTENCE}`
      : // Capitalised: this branch opens the sentence after "What courses does CARSI offer?".
        // The removed accreditation adjective used to supply that capital.
        `Restoration and cleaning courses across ${PUBLIC_TOPIC_LIST}. ${PROVIDER_STANDING_SENTENCE}`;
  return `What courses does CARSI offer? ${core}`;
}
