import { describe, expect, it } from 'vitest';

import {
  getAdminPageItems,
  paginateRows,
  parseAdminPageSizeChoice,
  resolveAdminPageSize,
} from '@/lib/admin/admin-pagination';

describe('getAdminPageItems', () => {
  it('returns every page when there are seven or fewer', () => {
    expect(getAdminPageItems(1, 1)).toEqual([1]);
    expect(getAdminPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('shows 1–5 then the last near the start', () => {
    expect(getAdminPageItems(1, 99)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 99]);
    expect(getAdminPageItems(5, 99)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 99]);
  });

  it('shows neighbours of a middle page', () => {
    expect(getAdminPageItems(50, 99)).toEqual([1, 'ellipsis', 49, 50, 51, 'ellipsis', 99]);
    expect(getAdminPageItems(6, 99)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 99]);
  });

  it('shows the last five near the end', () => {
    expect(getAdminPageItems(95, 99)).toEqual([1, 'ellipsis', 95, 96, 97, 98, 99]);
    expect(getAdminPageItems(99, 99)).toEqual([1, 'ellipsis', 95, 96, 97, 98, 99]);
  });

  it('clamps an out-of-range current page', () => {
    expect(getAdminPageItems(0, 99)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 99]);
    expect(getAdminPageItems(200, 99)).toEqual([1, 'ellipsis', 95, 96, 97, 98, 99]);
  });
});

describe('paginateRows page sizes', () => {
  const rows = Array.from({ length: 20 }, (_, i) => i + 1);

  it('shows 9 rows on the first page and recalculates when the size changes', () => {
    expect(paginateRows(rows, 1, 9).pageRows).toHaveLength(9);
    expect(paginateRows(rows, 1, 9).pageCount).toBe(3);
    expect(paginateRows(rows, 3, 9).pageRows).toEqual([19, 20]);

    expect(paginateRows(rows, 1, 18).pageRows).toHaveLength(18);
    expect(paginateRows(rows, 1, 18).pageCount).toBe(2);
    expect(paginateRows(rows, 5, 18).page).toBe(2);
  });

  it('shows every row when page size is all', () => {
    expect(paginateRows(rows, 1, resolveAdminPageSize('all', rows.length)).pageRows).toHaveLength(
      20
    );
    expect(paginateRows(rows, 1, resolveAdminPageSize('all', rows.length)).pageCount).toBe(1);
  });

  it('accepts a custom count', () => {
    expect(parseAdminPageSizeChoice('14')).toBe(14);
    expect(paginateRows(rows, 1, 14).pageRows).toHaveLength(14);
    expect(paginateRows(rows, 2, 14).pageRows).toEqual([15, 16, 17, 18, 19, 20]);
  });
});
