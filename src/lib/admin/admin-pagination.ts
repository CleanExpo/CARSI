export const ADMIN_LIST_PAGE_SIZE = 9;

export const ADMIN_PAGE_SIZE_PRESETS = [9, 18, 27, 36] as const;

export type AdminPageSizeChoice = number | 'all';

export type AdminPageItem = number | 'ellipsis';

const MAX_CUSTOM_PAGE_SIZE = 10_000;

export function resolveAdminPageSize(choice: AdminPageSizeChoice, total: number): number {
  if (choice === 'all') return Math.max(total, 1);
  const n = Math.floor(Number(choice));
  if (!Number.isFinite(n) || n < 1) return ADMIN_LIST_PAGE_SIZE;
  return Math.min(n, MAX_CUSTOM_PAGE_SIZE);
}

export function parseAdminPageSizeChoice(raw: string | number | null | undefined): AdminPageSizeChoice {
  if (raw === 'all' || raw === 'All') return 'all';
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return ADMIN_LIST_PAGE_SIZE;
  return Math.min(Math.floor(n), MAX_CUSTOM_PAGE_SIZE);
}

export function isAdminPageSizePreset(choice: AdminPageSizeChoice): boolean {
  return choice !== 'all' && (ADMIN_PAGE_SIZE_PRESETS as readonly number[]).includes(choice);
}

/**
 * Compact page window. Always includes first and last. Near the start, show
 * pages 1–5 then the last. Near the end, show the last five. In the middle,
 * show neighbours of the current page only.
 */
export function getAdminPageItems(current: number, total: number): AdminPageItem[] {
  if (total <= 0) return [];
  const page = Math.min(Math.max(1, current), total);
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (page <= 5) {
    return [1, 2, 3, 4, 5, 'ellipsis', total];
  }

  if (page >= total - 4) {
    return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', total];
}

export function paginateRows<T>(
  rows: readonly T[],
  page: number,
  pageSize: number = ADMIN_LIST_PAGE_SIZE
): { page: number; pageCount: number; pageRows: T[]; start: number } {
  const size = resolveAdminPageSize(pageSize, rows.length);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * size;
  return {
    page: safePage,
    pageCount,
    start,
    pageRows: rows.slice(start, start + size) as T[],
  };
}
