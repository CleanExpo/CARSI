import { cache } from 'react';

import { getBackendOrigin } from '@/lib/env/public-url';
import { prisma } from '@/lib/prisma';
import type { CourseListItem } from '@/lib/wordpress-export-courses';
import {
  loadWpExportCourses,
  mapWpExportToCourseListItem,
} from '@/lib/wordpress-export-courses';

import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';

export type CatalogueFactsSource = 'database' | 'wordpress_export' | 'api' | 'none';

export type PublicCatalogueFacts = {
  /** Number of published courses in the active catalogue source (matches `/courses` listing). */
  publishedCourseCount: number;
  /** Distinct IICRC discipline codes present on those courses (uppercase), sorted. */
  disciplineCodes: string[];
  /** Where the numbers came from — same resolution order as the course catalogue. */
  source: CatalogueFactsSource;
};

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
      items?: Array<{ discipline?: string | null; iicrc_discipline?: string | null }>;
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
      source: 'api',
    };
  } catch {
    return null;
  }
}

/**
 * Published course count and distinct IICRC discipline codes — **same resolution order** as
 * `getCourses()` on `/courses`: Prisma published courses → WordPress/seed export → LMS API.
 *
 * Use `deriveCatalogueFactsFromCourseItems` when you already have the listing array (avoids a
 * second query). For the homepage (no full list), call this directly.
 */
async function computePublicCatalogueFacts(): Promise<PublicCatalogueFacts> {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const count = await prisma.lmsCourse.count({ where: lmsPublishedCourseWhere });
      if (count > 0) {
        const rows = await prisma.lmsCourse.findMany({
          where: lmsPublishedCourseWhere,
          select: { iicrcDiscipline: true },
        });
        return {
          publishedCourseCount: count,
          disciplineCodes: collectDisciplineCodes(rows.map((r) => r.iicrcDiscipline)),
          source: 'database',
        };
      }
    } catch (e) {
      console.error('[catalogue-facts] database query failed', e);
    }
  }

  const exported = loadWpExportCourses();
  if (exported && exported.length > 0) {
    const items = exported.map(mapWpExportToCourseListItem);
    return {
      publishedCourseCount: items.length,
      disciplineCodes: collectDisciplineCodes(items.map((i) => i.discipline)),
      source: 'wordpress_export',
    };
  }

  const apiFacts = await fetchBackendCatalogueFacts();
  if (apiFacts) return apiFacts;

  return {
    publishedCourseCount: 0,
    disciplineCodes: [],
    source: 'none',
  };
}

/** Dedupes within a single request (e.g. `generateMetadata` + page both need facts). */
export const getPublicCatalogueFacts = cache(computePublicCatalogueFacts);

/** Marketing / SEO: plain count, no inflated “+” unless you add it at the callsite. */
export function formatCourseCountForCopy(n: number): string {
  return String(Math.max(0, Math.floor(n)));
}

export function catalogueMetaDescription(
  facts: PublicCatalogueFacts,
  opts?: { maxDisciplinesInList?: number }
): string {
  const n = facts.publishedCourseCount;
  const maxList = opts?.maxDisciplinesInList ?? 7;
  const codes = facts.disciplineCodes.slice(0, maxList);
  const list =
    codes.length > 0
      ? codes.join(', ')
      : 'WRT, CRT, ASD, AMRT, FSRT, OCT and CCT';
  if (n <= 0) {
    return `Browse IICRC CEC-approved restoration and cleaning courses across ${list}. Earn continuing education credits online with CARSI.`;
  }
  return `Browse ${n} IICRC CEC-approved restoration and cleaning courses across ${list}. Earn continuing education credits online with CARSI.`;
}

/** `/courses` index — question-led SEO line without a duplicated “Browse”. */
export function coursesIndexMetaDescription(facts: PublicCatalogueFacts): string {
  const maxList = 7;
  const codes = facts.disciplineCodes.slice(0, maxList);
  const list =
    codes.length > 0
      ? codes.join(', ')
      : 'WRT, CRT, ASD, AMRT, FSRT, OCT and CCT';
  const n = facts.publishedCourseCount;
  const core =
    n > 0
      ? `${n} IICRC CEC-approved restoration and cleaning courses across ${list}. Earn continuing education credits online with CARSI.`
      : `IICRC CEC-approved restoration and cleaning courses across ${list}. Earn continuing education credits online with CARSI.`;
  return `What courses does CARSI offer? ${core}`;
}
