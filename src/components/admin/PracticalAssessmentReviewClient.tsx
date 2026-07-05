'use client';

import { useCallback, useEffect, useState } from 'react';

type QueueItem = {
  id: string;
  status: string;
  createdAt: string;
  assessmentTitle: string;
  studentName: string;
  studentEmail: string;
  evidenceText: string;
};

type Criterion = {
  id: string;
  label: string;
  description: string;
  maxPoints: number;
  orderIndex: number;
};

type SubmissionDetail = {
  id: string;
  status: string;
  createdAt: string;
  evidenceText: string;
  evidenceUrls: string[];
  assessment: { id: string; title: string; instructions: string; passThreshold: number };
  criteria: Criterion[];
  student: { id: string; name: string; email: string };
};

type ReviewResult = { status?: string; totalScore?: number; maxScore?: number };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function PracticalAssessmentReviewClient() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<SubmissionDetail | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getJson<{ queue: QueueItem[] }>(
        '/api/admin/practical-assessments/review-queue',
      );
      setQueue(d.queue);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const d = await getJson<{ queue: QueueItem[] }>(
          '/api/admin/practical-assessments/review-queue',
        );
        if (!cancelled) setQueue(d.queue);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openReview(id: string) {
    setError(null);
    setFlash(null);
    try {
      const d = await getJson<{ submission: SubmissionDetail }>(
        `/api/admin/practical-assessments/submissions/${id}`,
      );
      setActive(d.submission);
      const init: Record<string, number> = {};
      for (const c of d.submission.criteria) init[c.id] = 0;
      setScores(init);
      setNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load submission');
    }
  }

  async function submitReview() {
    if (!active) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        scores: active.criteria.map((c) => ({ criterionId: c.id, points: scores[c.id] ?? 0 })),
        notes,
      };
      const res = await fetch(`/api/admin/practical-assessments/submissions/${active.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string; result?: ReviewResult };
      if (!res.ok) throw new Error(data.detail ?? 'Failed to record review');
      const passed = data.result?.status === 'passed';
      setFlash(
        `Recorded — ${passed ? 'PASSED' : 'FAILED'} (${data.result?.totalScore ?? 0}/${data.result?.maxScore ?? 0}).`,
      );
      setQueue((q) => q.filter((x) => x.id !== active.id));
      setActive(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record review');
    } finally {
      setSubmitting(false);
    }
  }

  const maxTotal = active ? active.criteria.reduce((a, c) => a + c.maxPoints, 0) : 0;
  const currentTotal = active ? active.criteria.reduce((a, c) => a + (scores[c.id] ?? 0), 0) : 0;
  const projectedPct = maxTotal > 0 ? Math.round((currentTotal / maxTotal) * 100) : 0;
  const wouldPass = active ? projectedPct >= active.assessment.passThreshold : false;

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white/95">Practical Assessment Reviews</h1>
          <p className="mt-1 text-sm text-white/50">
            Grade student practical-assessment submissions against their rubric.
          </p>
        </div>
        <button
          onClick={() => void loadQueue()}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 hover:border-white/30"
        >
          Refresh
        </button>
      </div>

      {flash && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {flash}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Review panel */}
      {active ? (
        <div className="flex flex-col gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white/95">{active.assessment.title}</h2>
              <p className="mt-1 text-sm text-white/60">
                {active.student.name} · {active.student.email} · submitted {formatDate(active.createdAt)}
              </p>
            </div>
            <button
              onClick={() => setActive(null)}
              className="shrink-0 text-sm text-white/50 underline hover:text-white/80"
            >
              Back to queue
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Instructions</p>
            <p className="mt-1 text-sm whitespace-pre-line text-white/70">
              {active.assessment.instructions}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Student evidence</p>
            <p className="mt-1 text-sm whitespace-pre-line text-white/80">{active.evidenceText}</p>
            {active.evidenceUrls.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-sm text-[#2490ed]">
                {active.evidenceUrls.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noreferrer" className="hover:underline">
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rubric grading */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Rubric</p>
            {active.criteria.length === 0 && (
              <p className="text-sm text-amber-300">
                This assessment has no rubric criteria defined — add criteria before it can be graded.
              </p>
            )}
            {active.criteria.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/90">{c.label}</p>
                  {c.description && <p className="mt-0.5 text-xs text-white/50">{c.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={c.maxPoints}
                    value={scores[c.id] ?? 0}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(c.maxPoints, Number(e.target.value) || 0));
                      setScores((s) => ({ ...s, [c.id]: v }));
                    }}
                    className="w-16 rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-right text-sm text-white/90 focus:border-[#2490ed] focus:outline-none"
                  />
                  <span className="text-sm text-white/40">/ {c.maxPoints}</span>
                </div>
              </div>
            ))}
          </div>

          <textarea
            placeholder="Reviewer notes (optional) — feedback the student will see…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/90 placeholder-white/25 focus:border-[#2490ed] focus:outline-none"
          />

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-sm text-white/70">
              Score <span className="font-semibold text-white/95">{currentTotal}</span> / {maxTotal} ·{' '}
              {projectedPct}% ·{' '}
              <span className={wouldPass ? 'text-emerald-300' : 'text-red-300'}>
                {wouldPass ? 'Pass' : 'Fail'}
              </span>{' '}
              <span className="text-white/40">(threshold {active.assessment.passThreshold}%)</span>
            </p>
            <button
              onClick={submitReview}
              disabled={submitting || active.criteria.length === 0}
              className="rounded-lg bg-[#2490ed] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a7fd4] disabled:opacity-50"
            >
              {submitting ? 'Recording…' : 'Record review'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {loading && <p className="text-sm text-white/50">Loading queue…</p>}
          {!loading && queue.length === 0 && (
            <p className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/50">
              No submissions awaiting review.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/95">{item.assessmentTitle}</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 uppercase">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/50">
                    {item.studentName} · {item.studentEmail} · {formatDate(item.createdAt)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-white/60">{item.evidenceText}</p>
                </div>
                <button
                  onClick={() => openReview(item.id)}
                  className="shrink-0 rounded-lg border border-[#2490ed]/40 px-4 py-2 text-sm font-medium text-[#2490ed] hover:bg-[#2490ed]/10"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
