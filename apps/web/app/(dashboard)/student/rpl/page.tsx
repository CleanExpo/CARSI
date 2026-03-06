'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

interface CPPUnit {
  unit_code: string;
  unit_name: string;
}

interface RPLSubmission {
  id: string;
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

function getUserId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('carsi_user_id') ?? '') : '';
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const id = getUserId();
  return { ...(id ? { 'X-User-Id': id } : {}), 'Content-Type': 'application/json', ...extra };
}

function _formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function RPLPortfolioPage() {
  const [units, setUnits] = useState<CPPUnit[]>([]);
  const [submissions, setSubmissions] = useState<RPLSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ unit_code: '', unit_name: '', evidence_description: '' });

  useEffect(() => {
    const headers = authHeaders();
    Promise.all([
      fetch(`${API}/api/lms/rpl/units`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API}/api/lms/rpl/portfolio/me`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([u, s]) => {
        setUnits(u);
        setSubmissions(s);
      })
      .catch(() => setError('Could not load data.'))
      .finally(() => setLoading(false));
  }, []);

  function handleUnitSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const unit = units.find((u) => u.unit_code === e.target.value);
    setForm((f) => ({
      ...f,
      unit_code: e.target.value,
      unit_name: unit?.unit_name ?? '',
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.unit_code || !form.evidence_description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`${API}/api/lms/rpl/portfolio`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          unit_code: form.unit_code,
          unit_name: form.unit_name,
          evidence_description: form.evidence_description,
          evidence_urls: [],
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const created: RPLSubmission = await resp.json();
      setSubmissions((prev) => [created, ...prev]);
      setForm({ unit_code: '', unit_name: '', evidence_description: '' });
    } catch {
      setError('Could not submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(id: string) {
    setWithdrawingId(id);
    try {
      const resp = await fetch(`${API}/api/lms/rpl/portfolio/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (resp.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-mono text-2xl font-bold text-white">RPL Portfolio</h1>
        <p className="text-sm leading-relaxed text-white/50">
          Submit evidence of your existing skills and experience. Mapped to the CPP40421 reference
          framework — for skill tracking purposes only.
        </p>
      </div>

      {loading && <p className="text-sm text-white/40">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Submission form */}
      {!loading && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-6"
        >
          <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
            New Application
          </h2>

          <select
            value={form.unit_code}
            onChange={handleUnitSelect}
            required
            className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="">Select CPP40421 unit…</option>
            {units.map((u) => (
              <option key={u.unit_code} value={u.unit_code}>
                {u.unit_code} — {u.unit_name}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Describe your evidence — work history, projects, qualifications, or other experience relevant to this unit…"
            value={form.evidence_description}
            onChange={(e) => setForm((f) => ({ ...f, evidence_description: e.target.value }))}
            rows={5}
            required
            className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:outline-none"
          />

          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-sm bg-cyan-600 px-4 py-2 font-mono text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      )}

      {/* Submission history */}
      {submissions.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
            Your Submissions
          </h2>
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-col gap-3 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm font-semibold text-white">
                    {sub.unit_code}
                  </span>
                  <span className="text-xs text-white/40">{sub.unit_name}</span>
                </div>
                <span
                  className={`shrink-0 rounded-sm px-2.5 py-1 font-mono text-xs font-semibold ${
                    STATUS_STYLES[sub.status] ?? STATUS_STYLES.pending
                  }`}
                >
                  {STATUS_LABELS[sub.status] ?? sub.status}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-white/60">{sub.evidence_description}</p>

              {sub.reviewer_notes && (
                <div className="rounded-sm border border-white/[0.04] bg-zinc-800/50 px-3 py-2">
                  <p className="text-xs text-white/40">Reviewer notes</p>
                  <p className="mt-0.5 text-sm text-white/70">{sub.reviewer_notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">
                  Submitted {_formatDate(sub.created_at)}
                  {sub.reviewed_at && ` · Reviewed ${_formatDate(sub.reviewed_at)}`}
                </span>
                {sub.status === 'pending' && (
                  <button
                    onClick={() => handleWithdraw(sub.id)}
                    disabled={withdrawingId === sub.id}
                    className="text-xs text-white/30 underline transition-colors hover:text-red-400 disabled:opacity-40"
                  >
                    {withdrawingId === sub.id ? 'Withdrawing…' : 'Withdraw'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && submissions.length === 0 && (
        <p className="text-sm text-white/30">No applications submitted yet.</p>
      )}
    </div>
  );
}
