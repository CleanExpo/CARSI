'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/components/auth/auth-provider';

interface RPLSubmission {
  id: string;
  student_id: string;
  unit_code: string;
  unit_name: string;
  evidence_description: string;
  evidence_urls: string[];
  status: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-zinc-800 text-zinc-400',
  under_review: 'bg-amber-950 text-amber-400',
  approved: 'bg-emerald-950 text-emerald-400',
  rejected: 'bg-red-950 text-red-400',
};

function _formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminRPLPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<RPLSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    apiClient
      .get<RPLSubmission[]>(`/api/lms/admin/rpl${qs}`)
      .then(setSubmissions)
      .catch(() => setError('Could not load submissions.'))
      .finally(() => setLoading(false));
  }, [statusFilter, user]);

  async function handleReview(id: string, decision: 'approved' | 'rejected') {
    setReviewingId(id);
    setError(null);
    try {
      const updated = await apiClient.patch<RPLSubmission>(`/api/lms/admin/rpl/${id}/review`, {
        decision,
        notes: notes[id] ?? null,
      });
      setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch {
      setError('Could not save review decision.');
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-2xl font-bold text-white">RPL Review Queue</h1>
          <p className="text-sm text-white/40">
            Review student Recognition of Prior Learning applications.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500/50 focus:outline-none"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="text-sm text-white/40">Loading…</p>}

      {!loading && submissions.length === 0 && (
        <p className="text-sm text-white/40">No submissions for this filter.</p>
      )}

      <div className="flex flex-col gap-4">
        {submissions.map((sub) => {
          const isReviewed = sub.status === 'approved' || sub.status === 'rejected';
          return (
            <div
              key={sub.id}
              className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">
                      {sub.unit_code}
                    </span>
                    <span
                      className={`rounded-sm px-2 py-0.5 font-mono text-xs font-semibold ${
                        STATUS_STYLES[sub.status] ?? STATUS_STYLES.pending
                      }`}
                    >
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-white/40">{sub.unit_name}</span>
                  <span className="text-xs text-white/30">
                    Student: <span className="font-mono">{sub.student_id.slice(0, 8)}…</span>
                    {' · '}Submitted {_formatDate(sub.created_at)}
                  </span>
                </div>
              </div>

              {/* Evidence */}
              <p className="rounded-sm border border-white/[0.04] bg-zinc-800/50 p-3 text-sm leading-relaxed text-white/70">
                {sub.evidence_description}
              </p>

              {/* Evidence URLs */}
              {sub.evidence_urls.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-white/30">Attached evidence</p>
                  {sub.evidence_urls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 underline"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              )}

              {/* Reviewer notes */}
              {sub.reviewer_notes && (
                <div className="rounded-sm border border-white/[0.04] bg-zinc-800/40 px-3 py-2">
                  <p className="text-xs text-white/40">Your notes</p>
                  <p className="mt-0.5 text-sm text-white/60">{sub.reviewer_notes}</p>
                </div>
              )}

              {/* Review controls (only for non-reviewed) */}
              {!isReviewed && (
                <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
                  <textarea
                    placeholder="Add reviewer notes (optional)…"
                    value={notes[sub.id] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                    rows={2}
                    className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(sub.id, 'approved')}
                      disabled={reviewingId === sub.id}
                      className="rounded-sm bg-emerald-700 px-4 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(sub.id, 'rejected')}
                      disabled={reviewingId === sub.id}
                      className="rounded-sm bg-zinc-700 px-4 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-zinc-600 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
