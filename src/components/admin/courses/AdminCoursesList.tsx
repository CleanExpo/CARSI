'use client';

import { Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { normalizeImageSrcForApp } from '@/lib/remote-image';

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

type Row = {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  moduleCount: number;
  isFree: boolean;
  priceAud: number;
  published: boolean;
  updatedAt: string;
  category?: string | null;
  level?: string | null;
  iicrcDiscipline?: string | null;
  cecHours?: string | null;
  durationHours?: string | null;
};

type StatusFilter = 'all' | 'draft' | 'published';
type SortKey = 'updated' | 'title' | 'modules';

function parseStatus(raw: string | null): StatusFilter {
  if (raw === 'draft' || raw === 'published') return raw;
  return 'all';
}

function parseSort(raw: string | null): SortKey {
  if (raw === 'title' || raw === 'modules' || raw === 'updated') return raw;
  return 'updated';
}

function buildCourseListParams(parts: {
  status: StatusFilter;
  q: string;
  sort: SortKey;
}) {
  const p = new URLSearchParams();
  if (parts.status !== 'all') p.set('status', parts.status);
  const qt = parts.q.trim();
  if (qt) p.set('q', qt);
  if (parts.sort !== 'updated') p.set('sort', parts.sort);
  return p;
}

/**
 * Native <img> (not next/image): CDNs like Cloudinary often block or throttle when a browser
 * Referer is sent from the admin origin; `referrerPolicy="no-referrer"` fixes intermittent
 * broken thumbnails. Decorative alt — title is already in the card heading.
 */
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
  cecHours,
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
  cecHours?: string | null;
  durationHours?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const src = normalizeImageSrcForApp(thumbnailUrl);

  useEffect(() => {
    setFailed(false);
  }, [thumbnailUrl]);

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
      cecHours={cecHours}
      durationHours={durationHours}
      backdropImageSrc={backdrop}
      backdropImageLoading={eager ? 'eager' : 'lazy'}
      backdropImageFetchPriority={eager ? 'high' : 'auto'}
      backdropImageReferrerPolicy="no-referrer"
      onBackdropImageError={() => setFailed(true)}
    />
  );
}

export function AdminCoursesList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const status = parseStatus(searchParams.get('status'));
  const qFromUrl = searchParams.get('q')?.trim() ?? '';
  const sort = parseSort(searchParams.get('sort'));

  const [queryDraft, setQueryDraft] = useState(qFromUrl);
  useEffect(() => {
    setQueryDraft(qFromUrl);
  }, [qFromUrl]);

  const apiUrl = useMemo(() => {
    const p = buildCourseListParams({ status, q: qFromUrl, sort });
    const qs = p.toString();
    return qs ? `/api/admin/courses?${qs}` : '/api/admin/courses';
  }, [status, qFromUrl, sort]);

  const [rows, setRows] = useState<Row[] | null>(null);
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

  useEffect(() => {
    setSelected(new Set());
  }, [status, qFromUrl, sort]);

  const load = useCallback(async () => {
    setLoadError(null);
    if (hasLoadedOnceRef.current) setRefreshing(true);
    try {
      const res = await fetch(apiUrl, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.detail === 'string' ? j.detail : 'Failed to load courses');
      }
      const data = (await res.json()) as { courses: Row[] };
      setRows(data.courses);
      hasLoadedOnceRef.current = true;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load');
      setRows([]);
      hasLoadedOnceRef.current = true;
    } finally {
      setRefreshing(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  // Debounce typing → URL `q` (keeps shareable links and server-side search)
  useEffect(() => {
    const normalized = queryDraft.trim();
    if (normalized === qFromUrl.trim()) return;
    const t = window.setTimeout(() => {
      const p = buildCourseListParams({ status, q: normalized, sort });
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 380);
    return () => window.clearTimeout(t);
  }, [queryDraft, qFromUrl, status, sort, pathname, router]);

  function replaceWithParams(next: { status?: StatusFilter; q?: string; sort?: SortKey }) {
    const p = buildCourseListParams({
      status: next.status ?? status,
      q: next.q !== undefined ? next.q : queryDraft,
      sort: next.sort ?? sort,
    });
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setQueryDraft('');
    router.replace(pathname, { scroll: false });
  }

  const hasActiveFilters =
    status !== 'all' || Boolean(qFromUrl) || sort !== 'updated' || queryDraft.trim() !== qFromUrl;

  const listRows = rows ?? [];
  const allVisibleSelected =
    listRows.length > 0 && listRows.every((r) => selected.has(r.id));

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = listRows.map((r) => r.id);
      const allOn = ids.length > 0 && ids.every((id) => next.has(id));
      if (allOn) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
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
      if (!res.ok) {
        throw new Error(typeof j.detail === 'string' ? j.detail : 'Update failed');
      }
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
      if (!res.ok) {
        throw new Error(typeof j.detail === 'string' ? j.detail : 'Delete failed');
      }
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

  if (rows === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading courses…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {loadError}
      </div>
    );
  }

  const emptyBecauseFilters = rows.length === 0 && hasActiveFilters;
  const emptyNoCourses = rows.length === 0 && !hasActiveFilters;

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'published', label: 'Published' },
    { id: 'draft', label: 'Draft' },
  ];

  const selectedRows = rows.filter((r) => selected.has(r.id));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Course admin</h1>
          <p className="mt-1 text-sm text-white/45">
            Create and manage courses, modules, and lesson content stored in the database.
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

      <div
        className="rounded-2xl border border-white/10 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/35"
              aria-hidden
            />
            <input
              type="search"
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              placeholder="Search by title or slug…"
              autoComplete="off"
              className="w-full rounded-xl border border-white/12 bg-black/25 py-2.5 pr-3 pl-10 text-sm text-white/90 placeholder:text-white/30 outline-none ring-[#2490ed]/0 transition-[box-shadow,border-color] focus:border-[#2490ed]/50 focus:ring-2 focus:ring-[#2490ed]/25"
              aria-label="Search courses"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex rounded-xl border border-white/10 p-0.5"
              style={{ background: 'rgba(0,0,0,0.2)' }}
              role="tablist"
              aria-label="Publication status"
            >
              {statusTabs.map((tab) => {
                const active = status === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => replaceWithParams({ status: tab.id })}
                    className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'text-white shadow-sm'
                        : 'text-white/45 hover:text-white/70'
                    }`}
                    style={
                      active
                        ? { background: '#2490ed' }
                        : { background: 'transparent' }
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-2 text-xs text-white/50">
              <span className="whitespace-nowrap">Sort</span>
              <select
                value={sort}
                onChange={(e) =>
                  replaceWithParams({ sort: parseSort(e.target.value) })
                }
                className="rounded-xl border border-white/12 bg-black/30 py-2 pr-8 pl-3 text-xs font-medium text-white/90 outline-none focus:border-[#2490ed]/50 focus:ring-2 focus:ring-[#2490ed]/25"
              >
                <option value="updated">Last updated</option>
                <option value="title">Title (A–Z)</option>
                <option value="modules">Most modules</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3 text-xs text-white/40">
          <p>
            <span className="font-medium text-white/60">{rows.length}</span>
            {rows.length === 1 ? ' course' : ' courses'}
            {refreshing ? (
              <span className="ml-2 inline-flex items-center gap-1 text-white/35">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating…
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {rows.length > 0 ? (
              <button
                type="button"
                onClick={() => toggleSelectAllVisible()}
                className="rounded-lg px-2 py-1 font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white/85"
              >
                {allVisibleSelected ? 'Deselect all' : 'Select all'}
              </button>
            ) : null}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => clearFilters()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[#2490ed] transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
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
              className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-xs font-medium text-white/75 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => void bulkSetPublished(true)}
              disabled={bulkBusy}
              className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#2490ed' }}
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => void bulkSetPublished(false)}
              disabled={bulkBusy}
              className="inline-flex items-center justify-center rounded-lg border border-amber-500/45 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
            >
              Set to draft
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={bulkBusy}
              className="inline-flex items-center justify-center rounded-lg border border-red-500/45 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/25 disabled:opacity-50"
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
            Build your first course with modules, optional reading text, and optional video
            (YouTube, Vimeo, or direct file URL).
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
            Try a different search, status, or sort — or clear filters to see everything.
          </p>
          <button
            type="button"
            onClick={() => clearFilters()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/5"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c, index) => (
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
                  cecHours={c.cecHours}
                  durationHours={c.durationHours}
                />

                <label
                  className="absolute top-2 right-2 z-20 flex cursor-pointer items-center gap-2 rounded-md border border-white/20 bg-black/55 px-2 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70"
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

                {!c.published && (
                  <span className="absolute top-2 left-2 rounded bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold tracking-wide text-black uppercase">
                    Draft
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="line-clamp-2 text-sm font-semibold text-white/95">{c.title}</h2>
                <p className="mt-1 font-mono text-[11px] text-white/35">{c.slug}</p>
                <p className="mt-3 text-xs text-white/45">
                  {c.moduleCount} module{c.moduleCount === 1 ? '' : 's'}
                  <span className="mx-1">·</span>
                  {c.isFree ? 'Free' : `AUD ${c.priceAud.toFixed(2)}`}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/courses/${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-xs font-medium text-white/85 transition-colors hover:bg-white/5"
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/35 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
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
            <DialogTitle>Delete {selected.size} course{selected.size === 1 ? '' : 's'}?</DialogTitle>
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
              <li className="list-none text-white/45">
                …and {selectedRows.length - 12} more
              </li>
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
