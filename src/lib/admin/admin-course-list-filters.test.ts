import { describe, expect, it } from 'vitest';

import {
  adminCourseListHasActiveFilters,
  buildAdminCourseListParams,
  DEFAULT_ADMIN_COURSE_LIST_FILTERS,
  filterAndSortAdminCourses,
  matchesAdminCourseFilters,
  parseAdminCourseListFilters,
  summariseAdminCourses,
  uniqueSortedLabels,
  type AdminCourseListRow,
} from './admin-course-list-filters';

function row(partial: Partial<AdminCourseListRow> & Pick<AdminCourseListRow, 'id' | 'title'>): AdminCourseListRow {
  return {
    slug: partial.slug ?? partial.id,
    moduleCount: 1,
    isFree: false,
    priceAud: 100,
    published: true,
    workflow_status: 'published',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...partial,
  };
}

describe('admin course list filters', () => {
  it('round-trips URL params and ignores defaults', () => {
    const qs = buildAdminCourseListParams({
      status: 'draft',
      q: 'mould',
      sort: 'price',
      cec: 'missing',
      price: 'paid',
      category: 'Restoration',
      level: 'Professional',
      view: 'table',
    });
    expect(qs.toString()).toContain('status=draft');
    expect(parseAdminCourseListFilters(qs)).toMatchObject({
      status: 'draft',
      q: 'mould',
      sort: 'price',
      cec: 'missing',
      price: 'paid',
      category: 'Restoration',
      level: 'Professional',
      view: 'table',
    });
    expect(buildAdminCourseListParams(DEFAULT_ADMIN_COURSE_LIST_FILTERS).toString()).toBe('');
  });

  it('matches search across title slug category and level', () => {
    const course = row({
      id: '1',
      title: 'Water damage',
      slug: 'water-damage',
      category: 'Restoration',
      level: 'Foundations',
    });
    expect(matchesAdminCourseFilters(course, { ...DEFAULT_ADMIN_COURSE_LIST_FILTERS, q: 'found' })).toBe(
      true
    );
    expect(matchesAdminCourseFilters(course, { ...DEFAULT_ADMIN_COURSE_LIST_FILTERS, q: 'xyz' })).toBe(
      false
    );
  });

  it('filters CEC approved vs missing vs excluded', () => {
    const approved = row({
      id: 'a',
      title: 'A',
      cecMissing: false,
      cecExcluded: false,
      resolvedCecHours: '2',
    });
    const missing = row({ id: 'm', title: 'M', cecMissing: true, cecExcluded: false });
    const excluded = row({ id: 'e', title: 'E', cecMissing: false, cecExcluded: true });
    expect(matchesAdminCourseFilters(approved, { ...DEFAULT_ADMIN_COURSE_LIST_FILTERS, cec: 'approved' })).toBe(
      true
    );
    expect(matchesAdminCourseFilters(missing, { ...DEFAULT_ADMIN_COURSE_LIST_FILTERS, cec: 'approved' })).toBe(
      false
    );
    expect(matchesAdminCourseFilters(excluded, { ...DEFAULT_ADMIN_COURSE_LIST_FILTERS, cec: 'excluded' })).toBe(
      true
    );
  });

  it('sorts paid first then highest price', () => {
    const rows = [
      row({ id: 'f', title: 'Free', isFree: true, priceAud: 0 }),
      row({ id: 'cheap', title: 'Cheap', priceAud: 50 }),
      row({ id: 'dear', title: 'Dear', priceAud: 400 }),
    ];
    const sorted = filterAndSortAdminCourses(rows, { ...DEFAULT_ADMIN_COURSE_LIST_FILTERS, sort: 'price' });
    expect(sorted.map((r) => r.id)).toEqual(['dear', 'cheap', 'f']);
  });

  it('summarises workflow and pricing', () => {
    const summary = summariseAdminCourses([
      row({ id: '1', title: 'P', workflow_status: 'published', published: true, cecMissing: true }),
      row({ id: '2', title: 'D', workflow_status: 'draft', published: false, isFree: true, priceAud: 0 }),
      row({ id: '3', title: 'R', workflow_status: 'in_review', published: false }),
    ]);
    expect(summary).toEqual({
      total: 3,
      published: 1,
      draft: 1,
      inReview: 1,
      cecMissing: 1,
      free: 1,
      paid: 2,
    });
    expect(adminCourseListHasActiveFilters(DEFAULT_ADMIN_COURSE_LIST_FILTERS)).toBe(false);
    expect(uniqueSortedLabels([row({ id: '1', title: 'A', category: 'Zed' })], 'category')).toEqual([
      'Zed',
    ]);
  });
});
