'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type CourseOption = { id: string; title: string };

type AssessmentRow = {
  id: string;
  title: string;
  courseTitle: string;
  passThreshold: number;
  isPublished: boolean;
  criteriaCount: number;
  submissionCount: number;
  createdAt: string;
};

type CriterionForm = { label: string; description: string; maxPoints: number };

type EditForm = {
  id: string | null;
  courseId: string;
  title: string;
  instructions: string;
  passThreshold: number;
  isPublished: boolean;
  criteria: CriterionForm[];
};

type AdminAssessment = {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  passThreshold: number;
  isPublished: boolean;
  criteria: { id: string; label: string; description: string; maxPoints: number }[];
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const BLANK_CRITERION: CriterionForm = { label: '', description: '', maxPoints: 5 };

export function PracticalAssessmentAuthorClient() {
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setError(null);
    const d = await getJson<{ assessments: AssessmentRow[]; courses: CourseOption[] }>(
      '/api/admin/practical-assessments',
    );
    setAssessments(d.assessments);
    setCourses(d.courses);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const d = await getJson<{ assessments: AssessmentRow[]; courses: CourseOption[] }>(
          '/api/admin/practical-assessments',
        );
        if (!cancelled) {
          setAssessments(d.assessments);
          setCourses(d.courses);
        }
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

  function startNew() {
    setError(null);
    setEditing({
      id: null,
      courseId: courses[0]?.id ?? '',
      title: '',
      instructions: '',
      passThreshold: 70,
      isPublished: false,
      criteria: [{ ...BLANK_CRITERION }],
    });
  }

  async function startEdit(id: string) {
    setError(null);
    try {
      const d = await getJson<{ assessment: AdminAssessment }>(
        `/api/admin/practical-assessments/${id}`,
      );
      const a = d.assessment;
      setEditing({
        id: a.id,
        courseId: a.courseId,
        title: a.title,
        instructions: a.instructions,
        passThreshold: a.passThreshold,
        isPublished: a.isPublished,
        criteria: a.criteria.length
          ? a.criteria.map((c) => ({ label: c.label, description: c.description, maxPoints: c.maxPoints }))
          : [{ ...BLANK_CRITERION }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assessment');
    }
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        courseId: editing.courseId,
        title: editing.title,
        instructions: editing.instructions,
        passThreshold: editing.passThreshold,
        isPublished: editing.isPublished,
        criteria: editing.criteria,
      };
      const url = editing.id
        ? `/api/admin/practical-assessments/${editing.id}`
        : '/api/admin/practical-assessments';
      const res = await fetch(url, {
        method: editing.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) throw new Error(data.detail ?? 'Failed to save');
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this assessment? This cannot be undone.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/practical-assessments/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) throw new Error(data.detail ?? 'Failed to delete');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  function patchCriterion(index: number, patch: Partial<CriterionForm>) {
    setEditing((f) =>
      f
        ? { ...f, criteria: f.criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)) }
        : f,
    );
  }

  const maxTotal = editing ? editing.criteria.reduce((a, c) => a + (c.maxPoints || 0), 0) : 0;

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white/95">Manage Practical Assessments</h1>
          <p className="mt-1 text-sm text-white/50">
            Author rubric-graded practical assessments for a course.
          </p>
        </div>
        <Link
          href="/admin/practical-assessments"
          className="text-sm text-white/50 underline hover:text-white/80"
        >
          Review queue →
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {editing ? (
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white/95">
              {editing.id ? 'Edit assessment' : 'New assessment'}
            </h2>
            <button
              onClick={() => setEditing(null)}
              className="text-sm text-white/50 underline hover:text-white/80"
            >
              Cancel
            </button>
          </div>

          {!editing.id && (
            <label className="flex flex-col gap-1 text-sm text-white/70">
              Course
              <select
                value={editing.courseId}
                onChange={(e) => setEditing((f) => (f ? { ...f, courseId: e.target.value } : f))}
                className="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/90 focus:border-[#2490ed] focus:outline-none"
              >
                <option value="">Select a course…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-white/70">
            Title
            <input
              type="text"
              value={editing.title}
              onChange={(e) => setEditing((f) => (f ? { ...f, title: e.target.value } : f))}
              className="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/90 focus:border-[#2490ed] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-white/70">
            Instructions for the student
            <textarea
              value={editing.instructions}
              onChange={(e) => setEditing((f) => (f ? { ...f, instructions: e.target.value } : f))}
              rows={4}
              className="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/90 focus:border-[#2490ed] focus:outline-none"
            />
          </label>

          <div className="flex items-end gap-4">
            <label className="flex flex-col gap-1 text-sm text-white/70">
              Pass threshold (%)
              <input
                type="number"
                min={0}
                max={100}
                value={editing.passThreshold}
                onChange={(e) =>
                  setEditing((f) =>
                    f ? { ...f, passThreshold: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : f,
                  )
                }
                className="w-24 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/90 focus:border-[#2490ed] focus:outline-none"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={editing.isPublished}
                onChange={(e) => setEditing((f) => (f ? { ...f, isPublished: e.target.checked } : f))}
              />
              Published (visible to students)
            </label>
          </div>

          {/* Rubric criteria */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">
                Rubric criteria · {maxTotal} pts total
              </p>
              <button
                onClick={() =>
                  setEditing((f) => (f ? { ...f, criteria: [...f.criteria, { ...BLANK_CRITERION }] } : f))
                }
                className="text-sm text-[#2490ed] hover:underline"
              >
                + Add criterion
              </button>
            </div>
            {editing.criteria.map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Criterion label (e.g. Correct PPE selection)"
                    value={c.label}
                    onChange={(e) => patchCriterion(i, { label: e.target.value })}
                    className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 text-sm text-white/90 focus:border-[#2490ed] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional) — what a full-mark answer looks like"
                    value={c.description}
                    onChange={(e) => patchCriterion(i, { description: e.target.value })}
                    className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 text-xs text-white/70 focus:border-[#2490ed] focus:outline-none"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1 pt-0.5">
                  <input
                    type="number"
                    min={1}
                    value={c.maxPoints}
                    onChange={(e) => patchCriterion(i, { maxPoints: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-16 rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 text-right text-sm text-white/90 focus:border-[#2490ed] focus:outline-none"
                  />
                  <span className="text-xs text-white/40">pts</span>
                </div>
                <button
                  onClick={() =>
                    setEditing((f) =>
                      f ? { ...f, criteria: f.criteria.filter((_, idx) => idx !== i) } : f,
                    )
                  }
                  disabled={editing.criteria.length <= 1}
                  className="pt-2 text-xs text-white/40 hover:text-red-300 disabled:opacity-30"
                  title="Remove criterion"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t border-white/10 pt-4">
            <button
              onClick={() => void save()}
              disabled={saving || !editing.title.trim() || (!editing.id && !editing.courseId)}
              className="rounded-lg bg-[#2490ed] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a7fd4] disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create assessment'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={startNew}
              disabled={courses.length === 0}
              className="rounded-lg bg-[#2490ed] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a7fd4] disabled:opacity-50"
            >
              + New assessment
            </button>
          </div>

          {loading && <p className="text-sm text-white/50">Loading…</p>}
          {!loading && assessments.length === 0 && (
            <p className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/50">
              No practical assessments yet. Create one to get started.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/95">{a.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                        a.isPublished
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {a.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/50">
                    {a.courseTitle} · {a.criteriaCount} criteria · pass {a.passThreshold}% ·{' '}
                    {a.submissionCount} submission{a.submissionCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => void startEdit(a.id)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-white/30"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void remove(a.id)}
                    className="rounded-lg border border-red-500/25 px-3 py-1.5 text-sm text-red-300/80 hover:border-red-500/50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
