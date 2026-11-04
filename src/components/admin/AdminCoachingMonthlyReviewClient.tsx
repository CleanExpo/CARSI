'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Member = {
  userId: string;
  email: string;
  fullName: string | null;
  subscriptionStatus: string;
};

type Priority = 'high' | 'medium' | 'low';

type DraftAction = {
  title: string;
  description: string | null;
  goalId: string | null;
  priority: Priority;
  dueDate: string;
};

type MonthInReview = {
  summary: string;
  counts: { total: number; done: number; blocked: number; open: number };
  completed: { title: string; note: string | null }[];
  blocked: { title: string; reason: string }[];
  open: { title: string; status: string }[];
  memberFlagged: string[];
};

export type MonthlyReviewView = {
  status: 'none' | 'draft';
  nextSession: { id: string; scheduledAt: string } | null;
  goals: { id: string; title: string }[];
  currentGuidance: string | null;
  generatedAt: string | null;
  source: 'model' | 'fallback' | null;
  review: MonthInReview | null;
  guidance: string;
  actions: DraftAction[];
};

type PostResponse = MonthlyReviewView & {
  detail?: string;
  result?: { status: string; published?: number };
};

const surface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';
const btn =
  'rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-40';
const primaryBtn =
  'rounded-lg border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/30 disabled:opacity-40';
const field =
  'w-full rounded-lg border border-white/15 bg-[#0b1220] px-3 py-2 text-sm text-white placeholder:text-white/30';
const label = 'text-xs font-semibold tracking-wide text-white/45 uppercase';

const PRIORITY_LABEL: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function defaultDue(view: MonthlyReviewView): string {
  const base = view.nextSession ? new Date(view.nextSession.scheduledAt) : new Date();
  base.setUTCDate(base.getUTCDate() + 28);
  return base.toISOString().slice(0, 10);
}

export function AdminCoachingMonthlyReviewClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState('');
  // The view carries the member it was loaded for; a response for anyone else is dropped, so a
  // slow request can never put member A's draft under member B (same guard as GP-633).
  const [loaded, setLoaded] = useState<{ userId: string; view: MonthlyReviewView } | null>(null);
  const [guidance, setGuidance] = useState('');
  const [actions, setActions] = useState<DraftAction[]>([]);
  const selectedRef = useRef('');
  const view = loaded && loaded.userId === selected ? loaded.view : null;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const show = useCallback((userId: string, next: MonthlyReviewView) => {
    setLoaded({ userId, view: next });
    setGuidance(next.guidance);
    setActions(next.actions);
  }, []);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/coaching/monthly-review');
      if (!res.ok) {
        setError('Could not load coaching members.');
        return;
      }
      const data = (await res.json()) as { members: Member[] };
      setMembers(data.members);
    })();
  }, []);

  const loadMember = useCallback(
    async (userId: string) => {
      selectedRef.current = userId;
      setSelected(userId);
      setLoaded(null);
      setNotice('');
      setError('');
      if (!userId) return;
      const res = await fetch(
        `/api/admin/coaching/monthly-review?userId=${encodeURIComponent(userId)}`
      );
      if (selectedRef.current !== userId) return;
      if (!res.ok) {
        setError('Could not load this member’s monthly review.');
        return;
      }
      const data = (await res.json()) as MonthlyReviewView;
      if (selectedRef.current !== userId) return;
      show(userId, data);
    },
    [show]
  );

  async function post(op: 'generate' | 'save' | 'approve' | 'discard') {
    const userId = loaded?.userId;
    if (!userId || userId !== selectedRef.current) return;
    if (
      op === 'approve' &&
      !window.confirm('Publish these actions and guidance to the member now?')
    ) {
      return;
    }
    if (
      op === 'discard' &&
      !window.confirm('Discard this draft review? The member never saw it.')
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setNotice(op === 'generate' ? 'Drafting the review. This can take up to a minute.' : '');
    try {
      const edits = op === 'save' || op === 'approve' ? { guidance, actions } : undefined;
      const res = await fetch('/api/admin/coaching/monthly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, op, edits }),
      });
      const data = (await res.json().catch(() => null)) as PostResponse | null;
      if (selectedRef.current !== userId) return;
      if (!res.ok || !data) {
        setNotice('');
        setError(data?.detail ?? 'That did not work. Nothing was published.');
        return;
      }
      show(userId, data);
      if (op === 'generate') setNotice('Draft ready. The member cannot see it yet.');
      if (op === 'save') setNotice('Draft saved. The member cannot see it yet.');
      if (op === 'discard') setNotice('Draft discarded.');
      if (op === 'approve') {
        const n = data.result?.published ?? 0;
        setNotice(
          `Published ${n} action${n === 1 ? '' : 's'} and the new guidance. The member sees them in their coaching portal now.`
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function updateAction(index: number, patch: Partial<DraftAction>) {
    setActions((list) => list.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  const review = view?.review ?? null;
  const hasDraft = view?.status === 'draft';

  return (
    <div className="px-5 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Monthly reviews</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/55">
          Before each session, draft the member’s month in review, next month’s actions and your
          guidance from their action board and prep notes. Edit anything, then approve. Nothing is
          visible to the member until you approve.
        </p>
      </header>

      {error ? (
        <p role="alert" className="mb-4 text-sm text-amber-300">
          {error}
        </p>
      ) : null}

      <label className="mb-6 block max-w-md">
        <span className={label}>Member</span>
        <select
          value={selected}
          disabled={busy}
          onChange={(e) => void loadMember(e.target.value)}
          className={`mt-2 ${field}`}
        >
          <option value="">Choose a coaching member…</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {(m.fullName?.trim() || m.email) + ` (${m.subscriptionStatus})`}
            </option>
          ))}
        </select>
      </label>

      {selected && !view && !error ? <p className="text-sm text-white/50">Loading…</p> : null}

      {view ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <section className={`p-5 ${surface}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Month in review</h2>
                <p className="mt-1 text-xs text-white/50">
                  {view.nextSession
                    ? `Next session ${formatDate(view.nextSession.scheduledAt)}`
                    : 'No upcoming session booked'}
                </p>
              </div>
              <button
                type="button"
                className={btn}
                disabled={busy}
                onClick={() => void post('generate')}
              >
                {hasDraft ? 'Draft again' : 'Draft review'}
              </button>
            </div>

            {notice ? (
              <p role="status" className="mt-3 text-xs text-sky-300">
                {notice}
              </p>
            ) : null}

            {!review ? (
              <p className="mt-4 text-sm text-white/50">
                No draft yet. Draft one before the session; the member will not see it.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-white/85">{review.summary}</p>
                <p className="text-xs text-white/45">
                  {review.counts.done} done · {review.counts.blocked} blocked · {review.counts.open}{' '}
                  open · {review.counts.total} on the board
                  {view.source === 'fallback'
                    ? ' · drafted from the board only (AI unavailable)'
                    : ' · drafted with AI'}
                </p>
                <ReviewList
                  heading="Completed"
                  items={review.completed.map((c) => (c.note ? `${c.title}: ${c.note}` : c.title))}
                  empty="Nothing marked done."
                />
                <ReviewList
                  heading="Blocked, and why"
                  items={review.blocked.map((b) => `${b.title}: ${b.reason}`)}
                  empty="Nothing blocked."
                />
                <ReviewList
                  heading="Still open"
                  items={review.open.map((o) => o.title)}
                  empty="Nothing open."
                />
                <ReviewList
                  heading="What the member flagged"
                  items={review.memberFlagged}
                  empty="No prep notes for this session."
                />
              </div>
            )}

            <div className="mt-6 border-t border-white/10 pt-4">
              <p className={label}>Guidance the member sees now</p>
              <p className="mt-2 text-sm text-white/60">
                {view.currentGuidance?.trim() || 'None yet.'}
              </p>
            </div>
          </section>

          <section className={`p-5 ${surface}`}>
            <h2 className="text-sm font-semibold text-white">Draft for next month</h2>
            <p className="mt-1 text-xs text-white/50">
              Coach only until approved. Approving publishes these actions to the member’s board and
              replaces the guidance on their home page.
            </p>

            {!hasDraft ? (
              <p className="mt-4 text-sm text-white/50">Draft a review to start editing.</p>
            ) : (
              <>
                <label className="mt-4 block">
                  <span className={label}>Latest guidance</span>
                  <textarea
                    value={guidance}
                    disabled={busy}
                    onChange={(e) => setGuidance(e.target.value)}
                    rows={4}
                    className={`mt-2 ${field}`}
                  />
                </label>

                <p className={`mt-5 ${label}`}>Actions ({actions.length})</p>
                <ol className="mt-2 space-y-3">
                  {actions.map((a, i) => (
                    <li key={i} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                      <div className="flex items-start gap-2">
                        <span className="w-5 pt-2 text-xs text-white/40">{i + 1}</span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <input
                            aria-label={`Action ${i + 1} title`}
                            value={a.title}
                            disabled={busy}
                            onChange={(e) => updateAction(i, { title: e.target.value })}
                            className={field}
                          />
                          <textarea
                            aria-label={`Action ${i + 1} detail`}
                            value={a.description ?? ''}
                            placeholder="Detail (optional)"
                            disabled={busy}
                            onChange={(e) =>
                              updateAction(i, { description: e.target.value || null })
                            }
                            rows={2}
                            className={field}
                          />
                          <div className="grid gap-2 sm:grid-cols-3">
                            <select
                              aria-label={`Action ${i + 1} goal`}
                              value={a.goalId ?? ''}
                              disabled={busy}
                              onChange={(e) => updateAction(i, { goalId: e.target.value || null })}
                              className={field}
                            >
                              <option value="">No goal</option>
                              {view.goals.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.title}
                                </option>
                              ))}
                            </select>
                            <select
                              aria-label={`Action ${i + 1} priority`}
                              value={a.priority}
                              disabled={busy}
                              onChange={(e) =>
                                updateAction(i, { priority: e.target.value as Priority })
                              }
                              className={field}
                            >
                              {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                                <option key={p} value={p}>
                                  {PRIORITY_LABEL[p]} priority
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              aria-label={`Action ${i + 1} due date`}
                              value={a.dueDate}
                              disabled={busy}
                              onChange={(e) => updateAction(i, { dueDate: e.target.value })}
                              className={field}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-2 pt-2 text-xs text-white/50 hover:text-amber-300 disabled:opacity-30"
                          disabled={busy}
                          onClick={() => setActions((list) => list.filter((_, j) => j !== i))}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  className={`mt-3 ${btn}`}
                  disabled={busy || actions.length >= 12}
                  onClick={() =>
                    setActions((list) => [
                      ...list,
                      {
                        title: '',
                        description: null,
                        goalId: null,
                        priority: 'medium',
                        dueDate: defaultDue(view),
                      },
                    ])
                  }
                >
                  Add action
                </button>

                <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    className={primaryBtn}
                    disabled={busy || !guidance.trim()}
                    onClick={() => void post('approve')}
                  >
                    Approve all and publish
                  </button>
                  <button
                    type="button"
                    className={btn}
                    disabled={busy}
                    onClick={() => void post('save')}
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    className={`${btn} sm:ml-auto`}
                    disabled={busy}
                    onClick={() => void post('discard')}
                  >
                    Discard draft
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ReviewList({
  heading,
  items,
  empty,
}: {
  heading: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-white/60">{heading}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-white/40">{empty}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((t, i) => (
            <li key={i} className="text-sm text-white/80">
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
