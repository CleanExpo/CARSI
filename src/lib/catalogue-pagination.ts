import { getAdminPageItems, type AdminPageItem } from '@/lib/admin/admin-pagination';

export const CATALOGUE_PAGE_SIZE_DEFAULT = 12;

export const CATALOGUE_PAGE_SIZE_PRESETS = [12, 24, 36, 48, 60] as const;

/** @deprecated Use CATALOGUE_PAGE_SIZE_PRESETS */
export const CATALOGUE_PAGE_SIZE_OPTIONS = CATALOGUE_PAGE_SIZE_PRESETS;

export type CataloguePageSizeChoice = number | 'all';

export type CataloguePageSize = CataloguePageSizeChoice;

export type CataloguePageItem = AdminPageItem;

const MAX_CUSTOM_PAGE_SIZE = 10_000;

export function resolveCataloguePageSize(
  choice: CataloguePageSizeChoice,
  total: number = 0
): number {
  if (choice === 'all') return Math.max(total, 1);
  const n = Math.floor(Number(choice));
  if (!Number.isFinite(n) || n < 1) return CATALOGUE_PAGE_SIZE_DEFAULT;
  return Math.min(n, MAX_CUSTOM_PAGE_SIZE);
}

export function parseCataloguePageSizeChoice(
  raw: string | number | null | undefined
): CataloguePageSizeChoice {
  if (raw === 'all' || raw === 'All') return 'all';
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return CATALOGUE_PAGE_SIZE_DEFAULT;
  return Math.min(Math.floor(n), MAX_CUSTOM_PAGE_SIZE);
}

export function isCataloguePageSizePreset(choice: CataloguePageSizeChoice): boolean {
  return choice !== 'all' && (CATALOGUE_PAGE_SIZE_PRESETS as readonly number[]).includes(choice);
}

export function isCataloguePageSize(value: number): boolean {
  return (CATALOGUE_PAGE_SIZE_PRESETS as readonly number[]).includes(value);
}

export function getCataloguePageItems(current: number, totalPages: number): CataloguePageItem[] {
  return getAdminPageItems(current, totalPages);
}

export function paginateCatalogueRows<T>(
  rows: readonly T[],
  page: number,
  pageSize: CataloguePageSizeChoice
): {
  page: number;
  pageCount: number;
  pageRows: T[];
  start: number;
  end: number;
  total: number;
} {
  const total = rows.length;
  const size = resolveCataloguePageSize(pageSize, total);
  const pageCount = Math.max(1, Math.ceil(Math.max(total, 0) / size) || 1);
  const safePage = total === 0 ? 1 : Math.min(Math.max(1, page), pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * size;
  const pageRows = rows.slice(start, start + size) as T[];
  const end = total === 0 ? 0 : start + pageRows.length;
  return { page: safePage, pageCount, pageRows, start, end, total };
}

export function formatCatalogueResultRange(start: number, end: number, total: number): string {
  if (total === 0) return 'Showing 0 of 0 courses';
  const from = start + 1;
  return `Showing ${from.toLocaleString('en-AU')}–${end.toLocaleString('en-AU')} of ${total.toLocaleString('en-AU')} courses`;
}
