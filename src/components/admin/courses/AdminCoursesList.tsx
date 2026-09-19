'use client';

import { LayoutGrid, List, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AdminPagination } from '@/components/admin/AdminPagination';
import { formatAdminDate } from '@/components/admin/admin-learner-ui';
import { useAdminListPaging } from '@/components/admin/use-admin-list-paging';
import { CourseTextThumbnail } from '@/components/lms/CourseTextThumbnail';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  adminCourseListHasActiveFilters,
  buildAdminCourseListParams,
  DEFAULT_ADMIN_COURSE_LIST_FILTERS,
  filterAndSortAdminCourses,
  parseAdminCourseListFilters,
  summariseAdminCourses,
  uniqueSortedLabels,
  type AdminCourseCecFilter,
  type AdminCourseListFilters,
  type AdminCoursePriceFilter,
  type AdminCourseSortKey,
  type AdminCourseStatusFilter,
  type AdminCourseView,
} from '@/lib/admin/admin-course-list-filters';
import { normalizeImageSrcForApp } from '@/lib/remote-image';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
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

function AdminCourseListThumb({
  thumbnailUrl,
  eager,
  title,
  moduleCount,
  isFree,
  priceAud,
  category,
  level,
  iicrcDiscipline,
  cecHoursLabel,
  durationHours,
}: {
  thumbnailUrl: string | null;
  eager?: boolean;
  title: string;
  moduleCount: number;
  isFree: boolean;
  priceAud: number;
  category?: string | null;
  level?: string | null;
  iicrcDiscipline?: string | null;
  cecHoursLabel?: string | null;
  durationHours?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const src = normalizeImageSrcForApp(thumbnailUrl);
  const [prevThumbnailUrl, setPrevThumbnailUrl] = useState(thumbnailUrl);
  if (prevThumbnailUrl !== thumbnailUrl) {
    setPrevThumbnailUrl(thumbnailUrl);
    setFailed(false);
  }
  const backdrop = src && !failed ? src : undefined;

  return (
    <CourseTextThumbnail
      variant="admin"
      className="absolute inset-0 min-h-[8.5rem]"
      title={title}
      category={category}
      discipline={iicrcDiscipline}
      priceLabel={isFree ? 'Free' : `AUD ${priceAud.toFixed(0)}`}
      isFree={isFree}
      moduleCount={moduleCount}
      level={level}
      cecHoursLabel={cecHoursLabel}
      durationHours={durationHours}
      backdropImageSrc={backdrop}
      backdropImageLoading={eager ? 'eager' : 'lazy'}
      backdropImageFetchPriority={eager ? 'high' : 'auto'}
      backdropImageReferrerPolicy="no-referrer"
      onBackdropImageError={() => setFailed(true)}
    />
  );
}

function workflowOf(row: Row): 'draft' | 'in_review' | 'published' {
  return row.workflow_status ?? (row.published ? 'published' : 'draft');
}

function WorkflowBadge({ row }: { row: Row }) {
  const wf = workflowOf(row);
  if (wf === 'in_review') {
    return (
      <span className="rounded bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold tracking-wide text-black uppercase">
        In review
      </span>
    );
  }
  if (wf === 'draft') {
    return (
      <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
        Draft
      </span>
    );
  }
  return (
    <span className="rounded border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-100 uppercase">
      Live
    </span>
  );
}

const chipBase = 'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors';
const chipOn = 'border-[#2490ed]/50 bg-[#2490ed]/15 text-[#7ec5ff]';
const chipOff = 'border-white/10 text-white/50 hover:text-white/80';

export function AdminCoursesList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  const urlFilters = useMemo(() => parseAdminCourseListFilters(searchParams), [searchParams]);

  const [queryDraft, setQueryDraft] = useState(urlFilters.q);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep draft search in sync with shareable URL
    setQueryDraft(urlFilters.q);
  }, [urlFilters.q]);

  const [allRows, setAllRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const bulkBusy = bulkSaving || bulkDeleting;

  const filterKey = [
    urlFilters.status,
    urlFilters.q,
    urlFilters.sort,
    urlFilters.cec,
    urlFilters.price,
    urlFilters.category,
    urlFilters.level,
    urlFilters.view,
  ].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setSelected(new Set());
  }

  const load = useCallback(async () => {
    setLoadError(null);
    if (hasLoadedOnceRef.current) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/courses', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.detail === 'string' ? j.detail : 'Failed to load courses');
      }
      const data = (await res.json()) as { courses: Row[] };
      setAllRows(data.courses);
      hasLoadedOnceRef.current = true;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load');
      setAllRows([]);
      hasLoadedOnceRef.current = true;
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount / reload helper
    void load();
  }, [load]);

  useEffect(() => {
    const normalized = queryDraft.trim();
    if (normalized === urlFilters.q) return;
    const t = window.setTimeout(() => {
      replaceFilters({ ...urlFilters, q: normalized });
    }, 280);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL write is local
  }, [queryDraft, urlFilters.q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function replaceFilters(next: AdminCourseListFilters) {
    const qs = buildAdminCourseListParams(next).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function patchFilters(patch: Partial<AdminCourseListFilters>) {
    replaceFilters({
      ...urlFilters,
      q: queryDraft,
      ...patch,
    });
  }

  function clearFilters() {
    setQueryDraft('');
    replaceFilters(DEFAULT_ADMIN_COURSE_LIST_FILTERS);
  }

  const catalogue = allRows ?? [];
  const summary = useMemo(() => summariseAdminCourses(catalogue), [catalogue]);
  const categories = useMemo(() => uniqueSortedLabels(catalogue, 'category'), [catalogue]);
  const levels = useMemo(() => uniqueSortedLabels(catalogue, 'level'), [catalogue]);

  const listRows = useMemo(
    () => filterAndSortAdminCourses(catalogue, { ...urlFilters, q: urlFilters.q }),
    [catalogue, urlFilters]
  );

  const hasActiveFilters =
    adminCourseListHasActiveFilters({ ...urlFilters, q: urlFilters.q }) ||
    queryDraft.trim() !== urlFilters.q;

  const paging = useAdminListPaging(listRows, filterKey);
  const { page: safePage, pageCount, pageRows, start: pageStart, setPage } = paging;
  const allVisibleSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const allMatchingSelected = listRows.length > 0 && listRows.every((r) => selected.has(r.id));

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = pageRows.map((r) => r.id);
      const allOn = ids.length > 0 && ids.every((id) => next.has(id));
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleSelectAllMatching() {
    setSelected((prev) => {
      const ids = listRows.map((r) => r.id);
      const allOn = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allOn) return new Set();
      return new Set(ids);
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkSetPublished(published: boolean) {
    if (selected.size === 0 || bulkBusy) return;
    setBulkSaving(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseIds: [...selected], published }),
      });
      const j = (await res.json().catch(() => ({}))) as { detail?: string; updated?: number };
      if (!res.ok) throw new Error(typeof j.detail === 'string' ? j.detail : 'Update failed');
      const n = typeof j.updated === 'number' ? j.updated : selected.size;
      toast({
        title: published ? 'Published' : 'Set to draft',
        description: `Updated ${n} course${n === 1 ? '' : 's'}.`,
      });
      setSelected(new Set());
      await load();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Update failed',
        variant: 'destructive',
      });
    } finally {
      setBulkSaving(false);
    }
  }

  async function confirmBulkDelete() {
    if (selected.size === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseIds: [...selected] }),
      });
      const j = (await res.json().catch(() => ({}))) as { detail?: string; deleted?: number };
      if (!res.ok) throw new Error(typeof j.detail === 'string' ? j.detail : 'Delete failed');
      const n = typeof j.deleted === 'number' ? j.deleted : selected.size;
      toast({
        title: 'Courses deleted',
        description: `Removed ${n} course${n === 1 ? '' : 's'} from the database.`,
      });
      setBulkDeleteOpen(false);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      setBulkDeleting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.detail === 'string' ? j.detail : 'Delete failed');
      }
      toast({ title: 'Course deleted' });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }

  if (allRows === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading courses…
      </div>
    );
  }

  if (loadError && catalogue.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
          {loadError}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          Try again
        </button>
      </div>
    );
  }

  const emptyBecauseFilters = listRows.length === 0 && hasActiveFilters;
  const emptyNoCourses = catalogue.length === 0 && !hasActiveFilters;
  const selectedRows = catalogue.filter((r) => selected.has(r.id));

  const statusTabs: { id: AdminCourseStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: summary.total },
    { id: 'published', label: 'Live', count: summary.published },
    { id: 'in_review', label: 'In review', count: summary.inReview },
    { id: 'draft', label: 'Draft', count: summary.draft },
  ];

  const priceTabs: { id: AdminCoursePriceFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Any price', count: summary.total },
    { id: 'paid', label: 'Paid', count: summary.paid },
    { id: 'free', label: 'Free', count: summary.free },
  ];

  const cecTabs: { id: AdminCourseCecFilter; label: string }[] = [
    { id: 'all', label: 'Any CEC' },
    { id: 'approved', label: 'CEC on site' },
    { id: 'missing', label: `CEC missing (${summary.cecMissing})` },
    { id: 'excluded', label: 'CEC n/a' },
  ];

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (urlFilters.status !== 'all') {
    chips.push({
      key: 'status',
      label: statusTabs.find((t) => t.id === urlFilters.status)?.label ?? urlFilters.status,
      clear: () => patchFilters({ status: 'all' }),
    });
  }
  if (urlFilters.price !== 'all') {
    chips.push({
      key: 'price',
      label: urlFilters.price === 'free' ? 'Free' : 'Paid',
      clear: () => patchFilters({ price: 'all' }),
    });
  }
  if (urlFilters.cec !== 'all') {
    chips.push({
      key: 'cec',
      label: cecTabs.find((t) => t.id === urlFilters.cec)?.label ?? urlFilters.cec,
      clear: () => patchFilters({ cec: 'all' }),
    });
  }
  if (urlFilters.category) {
    chips.push({
      key: 'category',
      label: urlFilters.category,
      clear: () => patchFilters({ category: '' }),
    });
  }
  if (urlFilters.level) {
    chips.push({
      key: 'level',
      label: urlFilters.level,
      clear: () => patchFilters({ level: '' }),
    });
  }
  if (urlFilters.q) {
    chips.push({
      key: 'q',
      label: `“${urlFilters.q}”`,
      clear: () => {
        setQueryDraft('');
        patchFilters({ q: '' });
      },
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Course admin</h1>
          <p className="mt-1 text-sm text-white/45">
            Catalogue, workflow, and CEC readiness in one place. Press{' '}
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
              /
            </kbd>{' '}
            to search.
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#2490ed' }}
        >
          <Plus className="h-4 w-4" />
          Add course
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Catalogue',
            value: summary.total,
            hint: `${summary.paid} paid · ${summary.free} free`,
          },
          { label: 'Live', value: summary.published, hint: 'Visible to learners' },
          { label: 'In review', value: summary.inReview, hint: 'Waiting to publish' },
          { label: 'CEC missing', value: summary.cecMissing, hint: 'No registry hours' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <p className="text-[11px] font-semibold tracking-wide text-white/40 uppercase">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-white/95 tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-xs text-white/40">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl border border-white/10 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/35"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
                placeholder="Search title, slug, category, or level…"
                autoComplete="off"
                className="w-full rounded-xl border border-white/12 bg-black/25 py-2.5 pr-3 pl-10 text-sm text-white/90 outline-none placeholder:text-white/30 focus:border-[#2490ed]/50 focus:ring-2 focus:ring-[#2490ed]/25"
                aria-label="Search courses"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-white/50">
                <span className="whitespace-nowrap">Sort</span>
                <select
                  value={urlFilters.sort}
                  onChange={(e) => patchFilters({ sort: e.target.value as AdminCourseSortKey })}
                  className="rounded-xl border border-white/12 bg-black/30 py-2 pr-8 pl-3 text-xs font-medium text-white/90 outline-none focus:border-[#2490ed]/50"
                >
                  <option value="updated">Last updated</option>
                  <option value="title">Title (A–Z)</option>
                  <option value="modules">Most modules</option>
                  <option value="price">Price (high–low)</option>
                </select>
              </label>
              {categories.length > 0 ? (
                <label className="flex items-center gap-2 text-xs text-white/50">
                  <span>Category</span>
                  <select
                    value={urlFilters.category}
                    onChange={(e) => patchFilters({ category: e.target.value })}
                    className="max-w-[11rem] rounded-xl border border-white/12 bg-black/30 py-2 pr-8 pl-3 text-xs font-medium text-white/90 outline-none"
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {levels.length > 0 ? (
                <label className="flex items-center gap-2 text-xs text-white/50">
                  <span>Level</span>
                  <select
                    value={urlFilters.level}
                    onChange={(e) => patchFilters({ level: e.target.value })}
                    className="max-w-[11rem] rounded-xl border border-white/12 bg-black/30 py-2 pr-8 pl-3 text-xs font-medium text-white/90 outline-none"
                  >
                    <option value="">All levels</option>
                    {levels.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div
                className="inline-flex rounded-xl border border-white/10 p-0.5"
                role="group"
                aria-label="Layout"
              >
                {(
                  [
                    { id: 'grid' as const, icon: LayoutGrid, label: 'Grid' },
                    { id: 'table' as const, icon: List, label: 'Table' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={urlFilters.view === opt.id}
                    onClick={() => patchFilters({ view: opt.id as AdminCourseView })}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold',
                      urlFilters.view === opt.id
                        ? 'bg-[#2490ed] text-white'
                        : 'text-white/45 hover:text-white/75'
                    )}
                  >
                    <opt.icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Publication status">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={urlFilters.status === tab.id}
                onClick={() => patchFilters({ status: tab.id })}
                className={cn(chipBase, urlFilters.status === tab.id ? chipOn : chipOff)}
              >
                {tab.label}
                <span className="ml-1.5 text-white/40 tabular-nums">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {priceTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => patchFilters({ price: tab.id })}
                className={cn(chipBase, urlFilters.price === tab.id ? chipOn : chipOff)}
              >
                {tab.label}
                <span className="ml-1.5 text-white/40 tabular-nums">{tab.count}</span>
              </button>
            ))}
            {cecTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => patchFilters({ cec: tab.id })}
                className={cn(
                  chipBase,
                  urlFilters.cec === tab.id
                    ? tab.id === 'missing'
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                      : chipOn
                    : chipOff
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3 text-xs text-white/40">
          <p>
            <span className="font-medium text-white/60">{listRows.length}</span>
            {listRows.length === 1 ? ' match' : ' matches'}
            <span className="text-white/30"> · {summary.total} in catalogue</span>
            {refreshing ? (
              <span className="ml-2 inline-flex items-center gap-1 text-white/35">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating…
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {listRows.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleSelectAllVisible()}
                  className="rounded-lg px-2 py-1 font-medium text-white/55 hover:bg-white/5 hover:text-white/85"
                >
                  {allVisibleSelected ? 'Deselect page' : 'Select page'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelectAllMatching()}
                  className="rounded-lg px-2 py-1 font-medium text-white/55 hover:bg-white/5 hover:text-white/85"
                >
                  {allMatchingSelected ? 'Deselect matches' : 'Select matches'}
                </button>
              </>
            ) : null}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => clearFilters()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[#2490ed] hover:bg-white/5 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/25 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:border-white/25 hover:text-white"
              >
                {chip.label}
                <X className="h-3 w-3 text-white/40" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selected.size > 0 ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-[#2490ed]/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: 'rgba(36,144,237,0.08)' }}
          role="region"
          aria-label="Bulk actions"
        >
          <p className="flex items-center gap-2 text-sm text-white/85">
            {bulkBusy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/60" /> : null}
            <span>
              <span className="font-semibold text-white">{selected.size}</span>
              {selected.size === 1 ? ' course' : ' courses'} selected
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/75 hover:bg-white/5 disabled:opacity-50"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => void bulkSetPublished(true)}
              disabled={bulkBusy}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: '#2490ed' }}
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => void bulkSetPublished(false)}
              disabled={bulkBusy}
              className="rounded-lg border border-amber-500/45 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/25 disabled:opacity-50"
            >
              Set to draft
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={bulkBusy}
              className="inline-flex items-center justify-center rounded-lg border border-red-500/45 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {emptyNoCourses ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-20 text-center"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <p className="text-lg font-medium text-white/80">No courses yet</p>
          <p className="mt-2 max-w-md text-sm text-white/45">
            Build your first course with modules, optional reading text, and optional video.
          </p>
          <Link
            href="/admin/courses/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#ed9d24' }}
          >
            <Plus className="h-4 w-4" />
            Add course
          </Link>
        </div>
      ) : emptyBecauseFilters ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <p className="text-lg font-medium text-white/80">No matching courses</p>
          <p className="mt-2 max-w-md text-sm text-white/45">
            Try another search, status, price, or CEC view — or clear filters to see the full
            catalogue.
          </p>
          <button
            type="button"
            onClick={() => clearFilters()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-white/5"
          >
            Clear filters
          </button>
        </div>
      ) : urlFilters.view === 'table' ? (
        <div className="overflow-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/8 text-[11px] tracking-wide text-white/40 uppercase">
              <tr>
                <th className="w-10 px-3 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-3 py-3 font-medium">Course</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Price</th>
                <th className="px-3 py-3 font-medium">Modules</th>
                <th className="px-3 py-3 font-medium">CEC</th>
                <th className="px-3 py-3 font-medium">Updated</th>
                <th className="px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-white/5 hover:bg-white/[0.03]"
                  onClick={() => router.push(`/admin/courses/${c.id}`)}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      className="h-3.5 w-3.5 rounded border-white/30 bg-black/40 text-[#2490ed]"
                      aria-label={`Select ${c.title}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-white/90">{c.title}</p>
                    <p className="font-mono text-[11px] text-white/35">{c.slug}</p>
                    {c.category ? (
                      <p className="mt-0.5 text-[11px] text-white/40">{c.category}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <WorkflowBadge row={c} />
                  </td>
                  <td className="px-3 py-3 text-white/70 tabular-nums">
                    {c.isFree ? 'Free' : `AUD ${c.priceAud.toFixed(2)}`}
                  </td>
                  <td className="px-3 py-3 text-white/70 tabular-nums">{c.moduleCount}</td>
                  <td className="px-3 py-3 text-white/70">
                    {c.cecExcluded
                      ? 'n/a'
                      : c.cecMissing
                        ? 'Missing'
                        : c.resolvedCecHours
                          ? `${c.resolvedCecHours} h`
                          : '—'}
                  </td>
                  <td className="px-3 py-3 text-white/50">{formatAdminDate(c.updatedAt)}</td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#7ec5ff] hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageRows.map((c, index) => (
            <article
              key={c.id}
              className="flex flex-col overflow-hidden rounded-xl border border-white/8"
              style={{ background: 'rgba(255,255,255,0.03)' }}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/admin/courses/${c.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/admin/courses/${c.id}`);
                }
              }}
              aria-label={`Edit course ${c.title}`}
            >
              <div className="relative aspect-video overflow-hidden bg-black/40">
                <AdminCourseListThumb
                  thumbnailUrl={c.thumbnailUrl}
                  eager={index < 9}
                  title={c.title}
                  moduleCount={c.moduleCount}
                  isFree={c.isFree}
                  priceAud={c.priceAud}
                  category={c.category}
                  level={c.level}
                  iicrcDiscipline={c.iicrcDiscipline}
                  cecHoursLabel={c.resolvedCecHours}
                  durationHours={c.durationHours ?? c.resolvedDurationHours}
                />
                {c.cecMissing ? (
                  <span className="absolute bottom-2 left-2 z-20 rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-100 uppercase">
                    CEC missing
                  </span>
                ) : null}
                <label
                  className="absolute top-2 right-2 z-20 flex cursor-pointer items-center gap-2 rounded-md border border-white/20 bg-black/55 px-2 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm hover:bg-black/70"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    className="h-3.5 w-3.5 rounded border-white/30 bg-black/40 text-[#2490ed] focus:ring-[#2490ed]/50"
                    aria-label={`Select ${c.title}`}
                  />
                  <span className="hidden sm:inline">Select</span>
                </label>
                <div className="absolute top-2 left-2 z-20">
                  <WorkflowBadge row={c} />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="line-clamp-2 text-sm font-semibold text-white/95">{c.title}</h2>
                <p className="mt-1 font-mono text-[11px] text-white/35">{c.slug}</p>
                <p className="mt-3 text-xs text-white/45">
                  {c.moduleCount} module{c.moduleCount === 1 ? '' : 's'}
                  <span className="mx-1">·</span>
                  {c.isFree ? 'Free' : `AUD ${c.priceAud.toFixed(2)}`}
                  <span className="mx-1">·</span>
                  {formatAdminDate(c.updatedAt)}
                </p>
                {c.category || c.level ? (
                  <p className="mt-1 text-[11px] text-white/35">
                    {[c.category, c.level].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/courses/${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(c);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/35 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {listRows.length > 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-xs text-white/40">
            Showing {pageStart + 1}–{pageStart + pageRows.length} of {listRows.length}
            {pageCount > 1 ? ` · page ${safePage} of ${pageCount}` : ''}
          </p>
          <AdminPagination
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={paging.pageSize}
            onPageSizeChange={paging.changePageSize}
          />
        </div>
      ) : null}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#0c101c] text-white">
          <DialogHeader>
            <DialogTitle>Delete course?</DialogTitle>
            <DialogDescription className="text-white/50">
              This removes <strong className="text-white/80">{deleteTarget?.title}</strong> and all
              modules and lessons from the database. Enrollments for this course may be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => !o && !bulkDeleting && setBulkDeleteOpen(false)}
      >
        <DialogContent className="border-white/10 bg-[#0c101c] text-white">
          <DialogHeader>
            <DialogTitle>
              Delete {selected.size} course{selected.size === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription className="text-white/50">
              This permanently removes the selected courses and all modules and lessons. Student
              enrollments for these courses may be affected.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-40 list-inside list-disc overflow-y-auto text-sm text-white/65">
            {selectedRows.slice(0, 12).map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
            {selectedRows.length > 12 ? (
              <li className="list-none text-white/45">…and {selectedRows.length - 12} more</li>
            ) : null}
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              onClick={() => void confirmBulkDelete()}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Deleting…' : 'Delete all'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
