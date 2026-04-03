'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

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
};

export function AdminCoursesList() {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
        // Avoid any caching; courses can change immediately after create/update.
        const res = await fetch('/api/admin/courses', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.detail === 'string' ? j.detail : 'Failed to load courses');
      }
      const data = (await res.json()) as { courses: Row[] };
      setRows(data.courses);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

      {rows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-20 text-center"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <p className="text-lg font-medium text-white/80">No courses yet</p>
          <p className="mt-2 max-w-md text-sm text-white/45">
            Build your first course with modules, optional reading text, and optional video (YouTube,
            Vimeo, or direct file URL).
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
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
              <div className="relative aspect-video bg-black/40">
                {c.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-white/30">
                    No thumbnail
                  </div>
                )}
                {!c.published && (
                  <span className="absolute left-2 top-2 rounded bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
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
    </div>
  );
}
