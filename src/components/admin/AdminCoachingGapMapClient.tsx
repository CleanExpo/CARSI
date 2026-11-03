'use client';

import { ArrowDown, ArrowUp, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  coachingAdminButton as btn,
  coachingAdminSurface as surface,
} from '@/components/admin/AdminCoachingLearningPathsClient';

type Course = { id: string; slug: string; title: string };

type AreaView = { area: string; label: string; edited: boolean; courses: Course[] };

type MapView = {
  chapters: Array<{ chapterSlug: string; areas: AreaView[] }>;
  options: Course[];
};

/**
 * GP-633 coach-editable gap-to-course map. Each change saves straight away; "Use the default"
 * drops the coach's edit for that gap. Changes apply to paths assigned from now on, not to paths
 * already on a member's board.
 */
export function AdminCoachingGapMapClient() {
  const [view, setView] = useState<MapView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/coaching/gap-map');
      if (!res.ok) {
        setError('Could not load the gap-to-course map.');
        return;
      }
      setView((await res.json()) as MapView);
    })();
  }, []);

  async function post(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/coaching/gap-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as MapView & { detail?: string };
      if (!res.ok) {
        setError(data.detail ?? 'Save failed.');
        return;
      }
      setView(data);
      setNotice(done);
    } finally {
      setBusy(false);
    }
  }

  function save(chapterSlug: string, a: AreaView, courseIds: string[]) {
    void post(
      { op: 'save', chapterSlug, area: a.area, courseIds },
      `${a.label}: saved. New paths use this list.`
    );
  }

  function move(chapterSlug: string, a: AreaView, index: number, delta: number) {
    const ids = a.courses.map((c) => c.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    save(chapterSlug, a, ids);
  }

  return (
    <section className="px-5 pb-10 sm:px-8">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-white">Gap-to-course map</h2>
        <p className="mt-1 max-w-2xl text-sm text-white/55">
          Which courses each assessment gap prescribes, in order. A new path takes up to four
          courses across the member’s gaps, skipping any they have finished. Changes apply to paths
          assigned from now on.
        </p>
      </header>

      {error ? <p className="mb-4 text-sm text-amber-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-xs text-sky-300">{notice}</p> : null}

      {!view && !error ? <Loader2 className="h-6 w-6 animate-spin text-sky-400" /> : null}

      {view?.chapters.map((ch) => (
        <div key={ch.chapterSlug} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ch.areas.map((a) => {
            const key = `${ch.chapterSlug}--${a.area}`;
            const onArea = new Set(a.courses.map((c) => c.id));
            const addable = view.options.filter((o) => !onArea.has(o.id));
            return (
              <article key={key} className={`flex flex-col p-5 ${surface}`} aria-label={a.label}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{a.label}</h3>
                  <span className="shrink-0 text-xs text-white/40">
                    {a.edited ? 'Edited by a coach' : 'Default'}
                  </span>
                </div>
                {a.courses.length === 0 ? (
                  <p className="mt-3 text-sm text-white/50">
                    No courses. This gap prescribes nothing.
                  </p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {a.courses.map((c, i) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                      >
                        <span className="w-4 text-xs text-white/40">{i + 1}</span>
                        <p className="min-w-0 flex-1 truncate text-sm text-white">{c.title}</p>
                        <button
                          type="button"
                          aria-label={`Move ${c.title} up`}
                          className="p-1 text-white/50 hover:text-white disabled:opacity-30"
                          disabled={busy || i === 0}
                          onClick={() => move(ch.chapterSlug, a, i, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${c.title} down`}
                          className="p-1 text-white/50 hover:text-white disabled:opacity-30"
                          disabled={busy || i === a.courses.length - 1}
                          onClick={() => move(ch.chapterSlug, a, i, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${c.title} from ${a.label}`}
                          className="p-1 text-white/50 hover:text-amber-300 disabled:opacity-30"
                          disabled={busy}
                          onClick={() =>
                            save(
                              ch.chapterSlug,
                              a,
                              a.courses.filter((x) => x.id !== c.id).map((x) => x.id)
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <select
                    aria-label={`Add a course to ${a.label}`}
                    value={adding[key] ?? ''}
                    onChange={(e) => setAdding((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0b1220] px-3 py-2 text-sm text-white"
                  >
                    <option value="">Add a published course…</option>
                    {addable.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={btn}
                    disabled={busy || !adding[key]}
                    onClick={() => {
                      const id = adding[key];
                      setAdding((prev) => ({ ...prev, [key]: '' }));
                      save(ch.chapterSlug, a, [...a.courses.map((x) => x.id), id]);
                    }}
                  >
                    Add
                  </button>
                </div>
                {a.edited ? (
                  <button
                    type="button"
                    className="mt-3 self-start text-xs text-white/50 underline-offset-2 hover:text-white hover:underline disabled:opacity-40"
                    disabled={busy}
                    onClick={() =>
                      void post(
                        { op: 'reset', chapterSlug: ch.chapterSlug, area: a.area },
                        `${a.label}: back to the default list.`
                      )
                    }
                  >
                    Use the default list
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      ))}
    </section>
  );
}
