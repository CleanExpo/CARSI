'use client';

import { useState } from 'react';

import {
  ADMIN_LIST_PAGE_SIZE,
  paginateRows,
  resolveAdminPageSize,
  type AdminPageSizeChoice,
} from '@/lib/admin/admin-pagination';

export function useAdminListPaging<T>(rows: readonly T[], resetKey?: string | number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSizeChoice>(ADMIN_LIST_PAGE_SIZE);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  if (resetKey !== undefined && prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const resolvedSize = resolveAdminPageSize(pageSize, rows.length);
  const paged = paginateRows(rows, page, resolvedSize);

  function changePageSize(next: AdminPageSizeChoice) {
    setPageSize(next);
    setPage(1);
  }

  return {
    page: paged.page,
    pageCount: paged.pageCount,
    pageRows: paged.pageRows,
    start: paged.start,
    setPage,
    pageSize,
    changePageSize,
    total: rows.length,
  };
}
