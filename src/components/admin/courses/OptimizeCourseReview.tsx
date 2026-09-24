'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { OptimizedCourseDraft } from '@/lib/admin/optimize-course-draft';
import { cn } from '@/lib/utils';

type Props = { courseId: string };

const panelClass = 'rounded-2xl border border-white/10 bg-white/[0.03]';

export function OptimizeCourseReview({ courseId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [courseTitle, setCourseTitle] = useState('Course');
  const [draft, setDraft] = useState<OptimizedCourseDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/optimize`, { cache: 'no-store' });
      const data = (await res.json()) as {
        courseTitle?: string;
        draft?: OptimizedCourseDraft | null;
        detail?: string;
      };
      if (!res.ok) throw new Error(data.detail || 'Could not load course');
      setCourseTitle(data.courseTitle || 'Course');
      setDraft(data.draft ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/optimize`, { method: 'POST' });
      const data = (await res.json().catch(() => null)) as {
        draft?: OptimizedCourseDraft;
        detail?: string;
      } | null;
      if (!res.ok || !data?.draft) {
        throw new Error(data?.detail || `Generate failed (${res.status})`);
      }
      setDraft(data.draft);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Generate failed';
      setError(message);
      toast({ title: message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  }

  async function apply() {
    if (!draft) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/optimize/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: draft.token,
          title: draft.title,
          description: draft.description,
          generatedAt: draft.generatedAt,
          modules: draft.modules,
        }),
      });
      const data = (await res.json()) as { detail?: string };
      if (!res.ok) throw new Error(data.detail || 'Save failed');
      toast({ title: 'Module content saved' });
      router.push(`/admin/courses/${courseId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Save failed';
      setError(message);
      toast({ title: message, variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  }

  async function discard() {
    const res = await fetch(`/api/admin/courses/${courseId}/optimize`, { method: 'DELETE' });
    if (!res.ok) {
      setError('Could not discard preview');
      return;
    }
    setDraft(null);
  }

  return (
    <div
      className="w-full min-w-0 px-4 py-6 font-sans tracking-normal sm:px-6 sm:py-8 lg:px-10 lg:py-10"
      style={{ wordSpacing: 'normal', letterSpacing: 'normal' }}
    >
      <header className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Link
            href="/admin/courses"
            className="inline-flex text-xs font-medium text-white/45 transition-colors hover:text-[#7ec5ff]"
          >
            Back to courses
          </Link>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Optimize content</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/50">{courseTitle}</p>
          <p className="max-w-2xl text-sm leading-relaxed text-white/40">
            Builds 7–10 modules with 3–4 paragraphs each. The last module is a recap of what you
            learnt. Pricing and media stay unchanged. Review, then save to the database.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading || running || applying}
            className="inline-flex min-w-[168px] items-center justify-center gap-2 rounded-xl bg-[#ed9d24] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {running ? 'Generating…' : draft ? 'Regenerate preview' : 'Generate preview'}
          </button>
          <Link
            href={`/admin/courses/${courseId}`}
            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white/75 hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </header>

      {error ? (
        <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm leading-relaxed text-red-100">
          {error}
        </section>
      ) : null}

      {running ? (
        <section className={cn(panelClass, 'mt-8 space-y-3 p-5 sm:p-6')}>
          <p className="flex items-center gap-2 text-sm text-white/80">
            <Loader2 className="h-4 w-4 animate-spin" />
            Writing module content. This can take a few minutes — keep this page open.
          </p>
        </section>
      ) : null}

      {loading ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-white/45">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading course…
        </p>
      ) : null}

      {!loading && !running && !draft && !error ? (
        <section className={cn(panelClass, 'mt-8 p-5 sm:p-6')}>
          <p className="text-sm leading-relaxed text-white/55">
            No preview yet. Click Generate preview to rewrite the existing module text. Nothing is
            saved until you confirm.
          </p>
        </section>
      ) : null}

      {draft && !running ? (
        <div className="mt-8 space-y-6">
          <section className={cn(panelClass, 'p-5 sm:p-6')}>
            <p className="text-[11px] font-semibold tracking-wide text-white/40 uppercase">
              Review
            </p>
            <p className="mt-2 text-sm text-white/55">
              {draft.modules.length} module{draft.modules.length === 1 ? '' : 's'} — preview only
              until you save
            </p>
          </section>

          {draft.modules.map((m, i) => (
            <article key={`${m.title}-${i}`} className={cn(panelClass, 'p-5 sm:p-6')}>
              <p className="text-[11px] font-semibold tracking-wide text-white/40 uppercase">
                Module {i + 1}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white/95">{m.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/70">
                {m.textContent.split(/\n\s*\n/).map((p, pi) => (
                  <p key={pi} className="whitespace-pre-wrap">
                    {p}
                  </p>
                ))}
              </div>
            </article>
          ))}

          <div className="sticky bottom-4 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md">
            <button
              type="button"
              onClick={() => void apply()}
              disabled={applying}
              className="inline-flex min-w-[168px] items-center justify-center gap-2 rounded-xl bg-[#ed9d24] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save to database
            </button>
            <button
              type="button"
              onClick={() => void discard()}
              disabled={applying}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white/75 hover:bg-white/5 disabled:opacity-50"
            >
              Discard preview
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
