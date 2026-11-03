'use client';

import { ArrowDown, ArrowUp, Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LEARNING_GAP_LABELS, type LearningGap } from '@/lib/coaching-portal/learning-path';

type Member = {
  userId: string;
  email: string;
  fullName: string | null;
  subscriptionStatus: string;
  /** Draft courses waiting for approval (older API responses may omit it). */
  draftCount?: number;
};

type PathItem = {
  actionId: string;
  courseId: string;
  slug: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  percent: number;
  /** Prescribed but not yet approved: the member cannot see it. */
  draft?: boolean;
};

type CourseOption = { id: string; slug: string; title: string };

type MemberView = {
  hasAssessment: boolean;
  gaps: LearningGap[];
  path: PathItem[];
  options: CourseOption[];
  pathStatus?: 'none' | 'draft' | 'approved';
  result?: { status: string };
};

const STATUS_LABEL: Record<PathItem['status'], string> = {
  todo: 'Not started',
  in_progress: 'In progress',
  done: 'Completed',
  blocked: 'Blocked',
};

const ASSIGN_RESULT: Record<string, string> = {
  assigned: 'Draft path created from the assessment. Review it, then approve it for the member.',
  approved: 'Path approved. The member now sees it on their Actions board and Resources page.',
  already_assigned: 'This member already has a path. Adjust it below.',
  no_assessment: 'No submitted assessment yet, so there is nothing to prescribe from.',
  no_gaps: 'The assessment shows no clear gap. Add courses by hand if you want a path.',
  no_modules: 'No published course matches these gaps yet. Add courses by hand.',
};

export const coachingAdminSurface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';
export const coachingAdminButton =
  'rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-40';
const surface = coachingAdminSurface;
const btn = coachingAdminButton;
const primaryBtn =
  'rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/30 disabled:opacity-40';

export function AdminCoachingLearningPathsClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string>('');
  // The view always carries the member it was loaded for. A response for any other member is
  // dropped, so a slow request can never put member A's path under member B (review r4 P1).
  const [loaded, setLoaded] = useState<{ userId: string; view: MemberView } | null>(null);
  const selectedRef = useRef('');
  const view = loaded && loaded.userId === selected ? loaded.view : null;
  const [addId, setAddId] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/coaching/learning-path');
      if (!res.ok) {
        setError('Could not load coaching members.');
        return;
      }
      const data = (await res.json()) as { members: Member[] };
      setMembers(data.members);
    })();
  }, []);

  const loadMember = useCallback(async (userId: string) => {
    selectedRef.current = userId;
    setSelected(userId);
    setLoaded(null);
    setAddId('');
    setNotice('');
    setError('');
    if (!userId) return;
    const res = await fetch(
      `/api/admin/coaching/learning-path?userId=${encodeURIComponent(userId)}`
    );
    if (selectedRef.current !== userId) return;
    if (!res.ok) {
      setError('Could not load this member’s learning path.');
      return;
    }
    const data = (await res.json()) as MemberView;
    if (selectedRef.current !== userId) return;
    setLoaded({ userId, view: data });
  }, []);

  async function post(body: Record<string, unknown>) {
    // Save for the member whose path is on screen, never a newer selection.
    const userId = loaded?.userId;
    if (!userId || userId !== selectedRef.current) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/coaching/learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...body }),
      });
      const data = (await res.json()) as MemberView & { detail?: string };
      if (selectedRef.current !== userId) return;
      if (!res.ok) {
        setError(data.detail ?? 'Save failed.');
        return;
      }
      setLoaded({ userId, view: data });
      setNotice(data.result ? (ASSIGN_RESULT[data.result.status] ?? '') : 'Path saved.');
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: number) {
    if (!view) return;
    const order = view.path.map((p) => p.courseId);
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    void post({ op: 'adjust', order });
  }

  const onPath = new Set(view?.path.map((p) => p.courseId) ?? []);
  const addable = view?.options.filter((o) => !onPath.has(o.id)) ?? [];

  return (
    <div className="px-5 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Learning paths</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/55">
          CARSI courses prescribed from each coaching member’s assessment. A new path is a draft the
          member cannot see. Review the gaps, remove, add or reorder courses, then approve it.
          Progress comes straight from the LMS.
        </p>
      </header>

      {error ? <p className="mb-4 text-sm text-amber-300">{error}</p> : null}

      <label className="mb-6 block max-w-md">
        <span className="text-xs font-semibold tracking-wide text-white/45 uppercase">Member</span>
        <select
          value={selected}
          disabled={busy}
          onChange={(e) => void loadMember(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b1220] px-3 py-2 text-sm text-white"
        >
          <option value="">Choose a coaching member…</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {(m.fullName?.trim() || m.email) +
                ` (${m.subscriptionStatus})` +
                (m.draftCount ? ' · draft waiting for approval' : '')}
            </option>
          ))}
        </select>
      </label>

      {selected && !view && !error ? (
        <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
      ) : null}

      {view ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <section className={`p-5 ${surface}`}>
            <h2 className="text-sm font-semibold text-white">Assessment gaps</h2>
            {!view.hasAssessment ? (
              <p className="mt-2 text-sm text-white/50">No submitted assessment yet.</p>
            ) : view.gaps.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">No clear gap found in the answers.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {view.gaps.map((g) => (
                  <li key={g.area}>
                    <p className="text-sm font-medium text-white">
                      {LEARNING_GAP_LABELS[g.area]}{' '}
                      <span className="text-xs text-white/40">signal {g.score}</span>
                    </p>
                    <p className="text-xs text-white/50">{g.reasons.join(' · ')}</p>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className={`mt-5 ${btn}`}
              disabled={busy || view.path.length > 0 || !view.hasAssessment}
              onClick={() => void post({ op: 'assign' })}
            >
              Assign from assessment
            </button>
          </section>

          <section className={`p-5 ${surface}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Prescribed path</h2>
              {view.pathStatus === 'draft' ? (
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                  Draft, not visible to the member
                </span>
              ) : view.pathStatus === 'approved' ? (
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                  Approved, visible to the member
                </span>
              ) : null}
            </div>
            {notice ? <p className="mt-2 text-xs text-sky-300">{notice}</p> : null}
            {view.pathStatus === 'draft' ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-3">
                <p className="min-w-0 flex-1 text-xs text-white/70">
                  Check the courses below. Approving publishes the path to the member’s Actions
                  board and Resources page.
                </p>
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={busy}
                  onClick={() => void post({ op: 'approve' })}
                >
                  Approve path
                </button>
              </div>
            ) : null}
            {view.path.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">No courses on this path yet.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {view.path.map((p, i) => (
                  <li
                    key={p.actionId}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                  >
                    <span className="w-5 text-xs text-white/40">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{p.title}</p>
                      <p className="text-xs text-white/45">
                        {p.draft ? 'Draft' : STATUS_LABEL[p.status]} · {p.percent}%
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Move up"
                      className="p-1 text-white/50 hover:text-white disabled:opacity-30"
                      disabled={busy || i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      className="p-1 text-white/50 hover:text-white disabled:opacity-30"
                      disabled={busy || i === view.path.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${p.title}`}
                      className="p-1 text-white/50 hover:text-amber-300 disabled:opacity-30"
                      disabled={busy}
                      onClick={() => void post({ op: 'adjust', remove: [p.courseId] })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <select
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
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
                disabled={busy || !addId}
                onClick={() => {
                  const id = addId;
                  setAddId('');
                  void post({ op: 'adjust', add: [id] });
                }}
              >
                Add to path
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
