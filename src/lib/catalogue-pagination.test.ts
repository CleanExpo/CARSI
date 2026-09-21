import { describe, expect, it } from 'vitest';

import {
  CATALOGUE_PAGE_SIZE_DEFAULT,
  formatCatalogueResultRange,
  getCataloguePageItems,
  paginateCatalogueRows,
  parseCataloguePageSizeChoice,
  resolveCataloguePageSize,
} from '@/lib/catalogue-pagination';

describe('catalogue pagination', () => {
  const rows = Array.from({ length: 1000 }, (_, i) => i + 1);

  it('defaults to 12 rows on the first page', () => {
    const first = paginateCatalogueRows(rows, 1, CATALOGUE_PAGE_SIZE_DEFAULT);
    expect(first.pageRows).toHaveLength(12);
    expect(first.start).toBe(0);
    expect(first.end).toBe(12);
    expect(first.pageCount).toBe(84);
    expect(formatCatalogueResultRange(first.start, first.end, first.total)).toBe(
      'Showing 1–12 of 1,000 courses'
    );
  });

  it('uses page 5 of 12 as 49–60', () => {
    const fifth = paginateCatalogueRows(rows, 5, 12);
    expect(fifth.pageRows[0]).toBe(49);
    expect(fifth.pageRows.at(-1)).toBe(60);
    expect(formatCatalogueResultRange(fifth.start, fifth.end, fifth.total)).toBe(
      'Showing 49–60 of 1,000 courses'
    );
  });

  it('clamps an empty last page after the list shrinks', () => {
    const few = Array.from({ length: 12 }, (_, i) => i + 1);
    const paging = paginateCatalogueRows(few, 3, 12);
    expect(paging.page).toBe(1);
    expect(paging.pageRows).toHaveLength(12);
  });

  it('recalculates pages when the size changes', () => {
    expect(paginateCatalogueRows(rows, 1, 24).pageRows).toHaveLength(24);
    expect(paginateCatalogueRows(rows, 1, 24).pageCount).toBe(42);
    expect(paginateCatalogueRows(rows, 1, 60).pageCount).toBe(17);
  });

  it('falls back to the default size for invalid values', () => {
    expect(resolveCataloguePageSize(0)).toBe(12);
    expect(resolveCataloguePageSize(-3)).toBe(12);
  });

  it('shows every row when page size is all', () => {
    const all = paginateCatalogueRows(rows, 1, 'all');
    expect(all.pageRows).toHaveLength(1000);
    expect(all.pageCount).toBe(1);
    expect(formatCatalogueResultRange(all.start, all.end, all.total)).toBe(
      'Showing 1–1,000 of 1,000 courses'
    );
  });

  it('accepts a custom count', () => {
    expect(parseCataloguePageSizeChoice('14')).toBe(14);
    expect(paginateCatalogueRows(rows, 1, 14).pageRows).toHaveLength(14);
    expect(paginateCatalogueRows(rows, 2, 14).pageRows[0]).toBe(15);
  });

  it('matches the compact page window', () => {
    expect(getCataloguePageItems(5, 99)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 99]);
    expect(getCataloguePageItems(50, 99)).toEqual([1, 'ellipsis', 49, 50, 51, 'ellipsis', 99]);
    expect(getCataloguePageItems(99, 99)).toEqual([1, 'ellipsis', 95, 96, 97, 98, 99]);
  });
});
