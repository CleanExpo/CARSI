export type AdminCourseStatusFilter = 'all' | 'draft' | 'in_review' | 'published';
export type AdminCourseSortKey = 'updated' | 'title' | 'modules' | 'price';
export type AdminCourseCecFilter = 'all' | 'approved' | 'missing' | 'excluded';
export type AdminCoursePriceFilter = 'all' | 'free' | 'paid';
export type AdminCourseView = 'grid' | 'table';

export type AdminCourseListRow = {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl?: string | null;
  moduleCount: number;
  isFree: boolean;
  priceAud: number;
  published: boolean;
  workflow_status?: 'draft' | 'in_review' | 'published';
  updatedAt: string;
  category?: string | null;
  level?: string | null;
  iicrcDiscipline?: string | null;
  cecHoursLabel?: string | null;
  durationHours?: string | null;
  resolvedCecHours?: string | null;
  cecMissing?: boolean;
  cecExcluded?: boolean;
  resolvedDurationHours?: string | null;
  durationMissing?: boolean;
};

export type AdminCourseListFilters = {
  status: AdminCourseStatusFilter;
  q: string;
  sort: AdminCourseSortKey;
  cec: AdminCourseCecFilter;
  price: AdminCoursePriceFilter;
  category: string;
  level: string;
  view: AdminCourseView;
};

export const DEFAULT_ADMIN_COURSE_LIST_FILTERS: AdminCourseListFilters = {
  status: 'all',
  q: '',
  sort: 'updated',
  cec: 'all',
  price: 'all',
  category: '',
  level: '',
  view: 'grid',
};

export function parseAdminCourseStatus(raw: string | null): AdminCourseStatusFilter {
  if (raw === 'draft' || raw === 'published' || raw === 'in_review') return raw;
  return 'all';
}

export function parseAdminCourseSort(raw: string | null): AdminCourseSortKey {
  if (raw === 'title' || raw === 'modules' || raw === 'updated' || raw === 'price') return raw;
  return 'updated';
}

export function parseAdminCourseCec(raw: string | null): AdminCourseCecFilter {
  if (raw === 'missing' || raw === 'approved' || raw === 'excluded') return raw;
  return 'all';
}

export function parseAdminCoursePrice(raw: string | null): AdminCoursePriceFilter {
  if (raw === 'free' || raw === 'paid') return raw;
  return 'all';
}

export function parseAdminCourseView(raw: string | null): AdminCourseView {
  return raw === 'table' ? 'table' : 'grid';
}

export function parseAdminCourseListFilters(params: {
  get: (key: string) => string | null;
}): AdminCourseListFilters {
  return {
    status: parseAdminCourseStatus(params.get('status')),
    q: params.get('q')?.trim() ?? '',
    sort: parseAdminCourseSort(params.get('sort')),
    cec: parseAdminCourseCec(params.get('cec')),
    price: parseAdminCoursePrice(params.get('price')),
    category: params.get('category')?.trim() ?? '',
    level: params.get('level')?.trim() ?? '',
    view: parseAdminCourseView(params.get('view')),
  };
}

export function buildAdminCourseListParams(parts: AdminCourseListFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (parts.status !== 'all') p.set('status', parts.status);
  const qt = parts.q.trim();
  if (qt) p.set('q', qt);
  if (parts.sort !== 'updated') p.set('sort', parts.sort);
  if (parts.cec !== 'all') p.set('cec', parts.cec);
  if (parts.price !== 'all') p.set('price', parts.price);
  if (parts.category.trim()) p.set('category', parts.category.trim());
  if (parts.level.trim()) p.set('level', parts.level.trim());
  if (parts.view !== 'grid') p.set('view', parts.view);
  return p;
}

export function adminCourseListHasActiveFilters(f: AdminCourseListFilters): boolean {
  return (
    f.status !== 'all' ||
    Boolean(f.q.trim()) ||
    f.sort !== 'updated' ||
    f.cec !== 'all' ||
    f.price !== 'all' ||
    Boolean(f.category.trim()) ||
    Boolean(f.level.trim())
  );
}

function workflowOf(row: AdminCourseListRow): 'draft' | 'in_review' | 'published' {
  return row.workflow_status ?? (row.published ? 'published' : 'draft');
}

export function matchesAdminCourseFilters(
  row: AdminCourseListRow,
  filters: Pick<AdminCourseListFilters, 'status' | 'q' | 'cec' | 'price' | 'category' | 'level'>
): boolean {
  const wf = workflowOf(row);
  if (filters.status !== 'all' && wf !== filters.status) return false;

  if (filters.price === 'free' && !row.isFree) return false;
  if (filters.price === 'paid' && row.isFree) return false;

  if (filters.cec === 'missing' && !row.cecMissing) return false;
  if (filters.cec === 'excluded' && !row.cecExcluded) return false;
  if (filters.cec === 'approved' && (row.cecMissing || row.cecExcluded || !row.resolvedCecHours)) {
    return false;
  }

  if (filters.category && (row.category ?? '') !== filters.category) return false;
  if (filters.level && (row.level ?? '') !== filters.level) return false;

  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  const hay = [row.title, row.slug, row.category, row.level]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

export function sortAdminCourseRows(
  rows: AdminCourseListRow[],
  sort: AdminCourseSortKey
): AdminCourseListRow[] {
  const copy = [...rows];
  if (sort === 'title') {
    copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  } else if (sort === 'modules') {
    copy.sort((a, b) => b.moduleCount - a.moduleCount || a.title.localeCompare(b.title));
  } else if (sort === 'price') {
    copy.sort((a, b) => {
      if (a.isFree !== b.isFree) return a.isFree ? 1 : -1;
      return b.priceAud - a.priceAud;
    });
  } else {
    copy.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }
  return copy;
}

export function filterAndSortAdminCourses(
  rows: AdminCourseListRow[],
  filters: AdminCourseListFilters
): AdminCourseListRow[] {
  return sortAdminCourseRows(
    rows.filter((row) => matchesAdminCourseFilters(row, filters)),
    filters.sort
  );
}

export function summariseAdminCourses(rows: AdminCourseListRow[]) {
  let published = 0;
  let draft = 0;
  let inReview = 0;
  let cecMissing = 0;
  let free = 0;
  let paid = 0;
  for (const row of rows) {
    const wf = workflowOf(row);
    if (wf === 'published') published += 1;
    else if (wf === 'in_review') inReview += 1;
    else draft += 1;
    if (row.cecMissing) cecMissing += 1;
    if (row.isFree) free += 1;
    else paid += 1;
  }
  return { total: rows.length, published, draft, inReview, cecMissing, free, paid };
}

export function uniqueSortedLabels(
  rows: AdminCourseListRow[],
  key: 'category' | 'level'
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const v = row[key]?.trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
