/**
 * Front-desk tool: find_courses (READ-ONLY).
 *
 * Searches the published CARSI catalogue by keyword so the assistant can ground
 * "which courses do you have on X?" answers in live data instead of prose memory.
 * Mirrors the same published-course query + `publishedWhere` filter used by
 * `getAssistantCourseContextText`, so it never surfaces a draft/unpublished course.
 * It performs a Prisma read only — no writes, ever (Phase 1 invariant).
 */

import { prisma } from '@/lib/prisma';
import type { FrontDeskTool } from '../types';

const publishedWhere = {
  OR: [
    { isPublished: true },
    { status: { equals: 'published', mode: 'insensitive' as const } },
  ],
};

const MAX_MATCHES = 8;

export interface CourseMatch {
  slug: string;
  title: string;
  price: string;
  category: string;
  iicrcDiscipline: string | null;
  url: string;
  shortDescription: string | null;
}

/** Pure filter (exported for unit testing without a database). */
export function filterCourses(
  rows: Array<{
    slug: string;
    title: string;
    shortDescription: string | null;
    category: string | null;
    iicrcDiscipline: string | null;
    priceAud: unknown;
    isFree: boolean;
  }>,
  query: string
): CourseMatch[] {
  const needle = query.trim().toLowerCase();
  const terms = needle.split(/\s+/).filter(Boolean);

  const scored = rows
    .map((r) => {
      const haystack = [r.title, r.category, r.iicrcDiscipline, r.shortDescription]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      // No query terms → return everything (lets the model browse the catalogue).
      const score = terms.length === 0 ? 1 : terms.filter((t) => haystack.includes(t)).length;
      return { r, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES);

  return scored.map(({ r }) => ({
    slug: r.slug,
    title: r.title,
    price: r.isFree || Number(r.priceAud) <= 0 ? 'Free' : `AUD ${Number(r.priceAud).toFixed(2)}`,
    category: r.category?.trim() || 'General',
    iicrcDiscipline: r.iicrcDiscipline?.trim() || null,
    url: `/courses/${r.slug}`,
    shortDescription: r.shortDescription?.replace(/\s+/g, ' ').trim().slice(0, 220) || null,
  }));
}

export const findCoursesTool: FrontDeskTool = {
  name: 'find_courses',
  description:
    'Search the published CARSI course catalogue by keyword (e.g. "mould", "water damage", "carpet"). Returns matching course titles, prices, categories, IICRC-CEC discipline alignment, and public URLs. Use this before naming or recommending courses so facts come from live data.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Keywords to search for across course title, category, discipline, and description. Empty string lists the catalogue.',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  readOnly: true,
  async execute(args: Record<string, unknown>): Promise<{ matches: CourseMatch[] }> {
    if (!process.env.DATABASE_URL?.trim()) {
      return { matches: [] };
    }
    const query = typeof args.query === 'string' ? args.query : '';
    const rows = await prisma.lmsCourse.findMany({
      where: publishedWhere,
      orderBy: { updatedAt: 'desc' },
      take: 250,
      select: {
        slug: true,
        title: true,
        shortDescription: true,
        category: true,
        iicrcDiscipline: true,
        priceAud: true,
        isFree: true,
      },
    });
    return { matches: filterCourses(rows, query) };
  },
};
