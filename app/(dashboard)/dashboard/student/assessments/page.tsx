'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api/client';

type Criterion = { id: string; label: string; description: string; maxPoints: number };

type Submission = {
  id: string;
  status: string;
  totalScore: number | null;
  reviewerNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

type Assessment = {
  id: string;
  title: string;
  instructions: string;
  passThreshold: number;
  courseTitle: string;
  maxPoints: number;
  criteria: Criterion[];
  submission: Submission | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  under_review: 'bg-amber-100 text-amber-700',
  passed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting review',
  under_review: 'Under review',
  passed: 'Passed',
  failed: 'Not yet passed',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Can the student (re)submit? — no submission yet, or the last one failed. */
function canSubmit(sub: Submission | null): boolean {
  return !sub || sub.status === 'failed';
}

export default function StudentAssessmentsPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  async function load() {
    const d = await apiClient.get<{ assessments: Assessment[] }>('/api/lms/practical-assessments');
    setAssessments(d.assessments);
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const d = await apiClient.get<{ assessments: Assessment[] }>(
          '/api/lms/practical-assessments',
        );
        if (!cancelled) setAssessments(d.assessments);
      } catch {
        if (!cancelled) setError('Could not load your assessments.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function submit(id: string) {
    const text = (drafts[id] ?? '').trim();
    if (text.length < 10) {
      setError('Please describe your evidence (at least a sentence).');
      return;
    }
    setSubmittingId(id);
    setError(null);
    try {
      await apiClient.post(`/api/lms/practical-assessments/${id}`, { evidence_text: text });
      setDrafts((d) => ({ ...d, [id]: '' }));
      await load();
    } catch {
      setError('Could not submit. Please try again.');
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Practical Assessments</h1>
        <p className="text-sm leading-relaxed text-slate-500">
          Submit written evidence for the practical assessments in your enrolled courses. An
          instructor grades each submission against its rubric.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && assessments.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No practical assessments are available in your enrolled courses yet.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {assessments.map((a) => {
          const sub = a.submission;
          return (
            <div
              key={a.id}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{a.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {a.courseTitle} · pass mark {a.passThreshold}%
                  </p>
                </div>
                {sub && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      STATUS_STYLES[sub.status] ?? STATUS_STYLES.pending
                    }`}
                  >
                    {STATUS_LABELS[sub.status] ?? sub.status}
                  </span>
                )}
              </div>

              <p className="text-sm whitespace-pre-line text-slate-600">{a.instructions}</p>

              {/* Rubric (what you're graded on) */}
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  You&apos;ll be graded on · {a.maxPoints} pts
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {a.criteria.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-slate-700">
                        {c.label}
                        {c.description && (
                          <span className="block text-xs text-slate-400">{c.description}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{c.maxPoints} pts</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Result of a completed review */}
              {sub && (sub.status === 'passed' || sub.status === 'failed') && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-700">
                    Result: <span className="font-semibold">{sub.totalScore ?? 0}</span> / {a.maxPoints}{' '}
                    · reviewed {formatDate(sub.reviewedAt)}
                  </p>
                  {sub.reviewerNotes && (
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="text-slate-400">Feedback:</span> {sub.reviewerNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Submission form (first attempt or after a fail) */}
              {canSubmit(sub) ? (
                <div className="flex flex-col gap-3">
                  {sub?.status === 'failed' && (
                    <p className="text-xs text-slate-500">
                      You can revise your evidence and submit again.
                    </p>
                  )}
                  <textarea
                    placeholder="Describe your evidence — what you did, how, and against each rubric point…"
                    value={drafts[a.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                    rows={5}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#146fc2] focus:outline-none"
                  />
                  <button
                    onClick={() => void submit(a.id)}
                    disabled={submittingId === a.id}
                    className="self-start rounded-lg bg-[#146fc2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#115a9e] disabled:opacity-50"
                  >
                    {submittingId === a.id ? 'Submitting…' : 'Submit for review'}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Submitted {formatDate(sub?.createdAt ?? null)} — awaiting your instructor&apos;s review.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
