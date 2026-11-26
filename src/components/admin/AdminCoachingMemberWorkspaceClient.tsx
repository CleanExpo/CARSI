'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_COACHING_CHAPTER_SLUG,
  DEFAULT_COACHING_COACH,
} from '@/lib/coaching-portal/coach-routing';
import { listCoachingChapterOptions } from '@/lib/coaching-portal/coaching-chapters';
import type { OnboardingCoachBrief } from '@/lib/coaching-portal/onboarding-coach-brief';

type Member = {
  userId: string;
  email: string;
  fullName: string | null;
  subscriptionStatus: string;
  draftCount: number;
};

type Workspace = {
  businessName: string | null;
  chapterSlug: string;
  coachUserId: string;
  onboardingSubmittedAt: string | null;
  briefGeneratedAt: string | null;
  brief: OnboardingCoachBrief | null;
  growthPlan: {
    status: string;
    focusTitle: string | null;
    focusDescription: string | null;
    approvedAt: string | null;
  } | null;
  subscription: { status: string; startedAt: string } | null;
  hasOnboardingSnapshot: boolean;
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

/**
 * A member's loaded workspace, tagged with the member it is for and the selection it was loaded
 * for. `pick` counts every selection the admin makes, so picking A, then B, then A again is three
 * different selections: what was loaded for the first A is not what is on screen for the second.
 */
type Loaded = { userId: string; pick: number; workspace: Workspace };
/** The chapter assignment being edited, tagged the same way. */
type ChapterDraft = { userId: string; pick: number; chapterSlug: string; coachUserId: string };

export function AdminCoachingMemberWorkspaceClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState('');
  // GP-799: every piece of member data carries the member and the selection it was loaded for,
  // and is shown or saved only for that selection. Picking member B never shows A's chapter or
  // brief under B, a save can never post B's userId with A's chapter and coach, and picking A
  // again hides the older A data until the fresh load answers (a failed reload leaves nothing to
  // act on). `pickRef` is the one owner of "which selection is current": every answer is checked
  // against it.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<ChapterDraft | null>(null);
  const [pick, setPick] = useState(0);
  const pickRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const workspace =
    loaded && loaded.userId === selected && loaded.pick === pick ? loaded.workspace : null;
  const chapter =
    workspace && draft && draft.userId === selected && draft.pick === pick ? draft : null;
  const chapterSlug = chapter?.chapterSlug ?? DEFAULT_COACHING_CHAPTER_SLUG;
  const coachUserId = chapter?.coachUserId ?? DEFAULT_COACHING_COACH.id;

  const showWorkspace = useCallback((userId: string, forPick: number, ws: Workspace) => {
    setLoaded({ userId, pick: forPick, workspace: ws });
    setDraft({
      userId,
      pick: forPick,
      chapterSlug: ws.chapterSlug,
      coachUserId: ws.coachUserId,
    });
  }, []);

  const loadWorkspace = useCallback(
    async (userId: string, forPick: number) => {
      let data: { detail?: string; workspace?: Workspace } = {};
      let ok = false;
      try {
        const res = await fetch(
          `/api/admin/coaching/member-workspace?userId=${encodeURIComponent(userId)}`
        );
        ok = res.ok;
        data = (await res.json().catch(() => ({}))) as typeof data;
      } catch {
        // A network failure is a failed load, shown the same way.
      }
      // An answer for a selection the admin has since left is dropped, error or not.
      if (pickRef.current !== forPick) return;
      if (!ok || !data.workspace) {
        setError(data.detail ?? 'Could not load member.');
        return;
      }
      showWorkspace(userId, forPick, data.workspace);
      setError('');
    },
    [showWorkspace]
  );

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/coaching/member-workspace');
      if (!res.ok) return;
      const data = (await res.json()) as { members: Member[] };
      setMembers(data.members);
      // No selection has been made yet (every selection bumps `pickRef`): default to the first.
      if (data.members[0] && pickRef.current === 0) {
        pickRef.current += 1;
        setSelected(data.members[0].userId);
        setPick(pickRef.current);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    void (async () => {
      await loadWorkspace(selected, pickRef.current);
    })();
  }, [selected, pick, loadWorkspace]);

  function selectMember(userId: string) {
    // Clear the last member's notice and error at once (a setState in the selection effect trips
    // react-hooks/set-state-in-effect). Whatever was loaded before is hidden by its tag.
    pickRef.current += 1;
    setNotice('');
    setError('');
    setSelected(userId);
    setPick(pickRef.current);
  }

  async function post(op: string, extra: Record<string, unknown> = {}) {
    // Only for the member whose workspace is on screen.
    const forUser = selected;
    const forPick = pick;
    if (!forUser || !workspace) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      let ok = false;
      let data: { detail?: string; workspace?: Workspace } = {};
      try {
        const res = await fetch('/api/admin/coaching/member-workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: forUser, op, ...extra }),
        });
        ok = res.ok;
        data = (await res.json().catch(() => ({}))) as typeof data;
      } catch {
        // A network failure is a failed request, shown the same way.
      }
      // The admin moved to another selection while this was in flight: say nothing under it.
      if (pickRef.current !== forPick) return;
      if (!ok) {
        setError(data.detail ?? 'Request failed.');
        return;
      }
      if (data.workspace) showWorkspace(forUser, forPick, data.workspace);
      setNotice('Saved.');
    } finally {
      setBusy(false);
    }
  }

  const brief = workspace?.brief;
  const chapterOptions = listCoachingChapterOptions();

  function pickChapter(slug: string) {
    if (!chapter) return;
    const opt = chapterOptions.find((c) => c.slug === slug);
    setDraft({
      userId: chapter.userId,
      pick: chapter.pick,
      chapterSlug: slug,
      coachUserId: opt ? opt.coachUserId : chapter.coachUserId,
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-white">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-sky-400/90 uppercase">
          Coaching admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Member workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          Assign coach chapters (A5), read AI onboarding briefs (A1), and push suggested focus into
          a draft growth plan.
        </p>
      </header>

      <div className={`${surface} p-4`}>
        <label className={label} htmlFor="coaching-member-select">
          Coaching member
        </label>
        <select
          id="coaching-member-select"
          className={`${field} mt-2`}
          value={selected}
          onChange={(e) => selectMember(e.target.value)}
        >
          {members.length === 0 ? <option value="">No coaching subscribers yet</option> : null}
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.fullName?.trim() || m.email} · {m.subscriptionStatus}
              {m.draftCount > 0
                ? ` · ${m.draftCount} draft course${m.draftCount === 1 ? '' : 's'}`
                : ''}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}

      {selected && !workspace && !error ? (
        <p className="text-sm text-white/55" role="status">
          Loading member…
        </p>
      ) : null}

      {workspace ? (
        <>
          <section className={`${surface} space-y-4 p-5`}>
            <h2 className="text-lg font-semibold">Coach chapter (GP-632)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="chapter-slug">
                  Chapter slug
                </label>
                <select
                  id="chapter-slug"
                  className={`${field} mt-2`}
                  value={chapterSlug}
                  onChange={(e) => pickChapter(e.target.value)}
                >
                  {chapterOptions.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title} · {c.priceLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="coach-user-id">
                  Coach id
                </label>
                <input
                  id="coach-user-id"
                  className={`${field} mt-2`}
                  value={coachUserId}
                  readOnly
                  aria-readonly="true"
                  placeholder={DEFAULT_COACHING_COACH.id}
                />
              </div>
            </div>
            <button
              type="button"
              className={primaryBtn}
              disabled={busy || !chapter}
              onClick={() => void post('save-chapter', { chapterSlug, coachUserId })}
            >
              Save chapter assignment
            </button>
          </section>

          <section className={`${surface} space-y-4 p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Onboarding brief (A1)</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btn}
                  disabled={busy || !workspace.hasOnboardingSnapshot}
                  onClick={() => void post('regenerate-brief')}
                >
                  Regenerate brief
                </button>
                <button
                  type="button"
                  className={btn}
                  disabled={busy || !brief}
                  onClick={() => void post('apply-brief-plan')}
                >
                  Apply suggested focus to draft plan
                </button>
              </div>
            </div>
            {workspace.briefGeneratedAt ? (
              <p className="text-xs text-white/45">
                Generated{' '}
                {new Date(workspace.briefGeneratedAt).toLocaleString('en-AU', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                {brief?.source ? ` · ${brief.source}` : ''}
              </p>
            ) : (
              <p className="text-sm text-white/55">
                No brief yet — generated automatically when the member submits onboarding, or use
                Regenerate when a snapshot exists.
              </p>
            )}
            {brief ? (
              <div className="space-y-4 text-sm text-white/80" data-testid="admin-coach-brief">
                <p className="font-medium text-white">{brief.summary}</p>
                {brief.sections.map((s) => (
                  <div key={s.heading}>
                    <p className="text-xs font-semibold tracking-wide text-sky-300/90 uppercase">
                      {s.heading}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-white/75">{s.body}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-semibold tracking-wide text-white/45 uppercase">
                    Suggested focus
                  </p>
                  <p className="mt-1 font-medium text-white">{brief.suggestedFocusTitle}</p>
                  <p className="mt-1 text-white/70">{brief.suggestedFocusDescription}</p>
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {brief.draftActions.map((a) => (
                    <li key={a.title}>
                      <span className="font-medium text-white">{a.title}</span>
                      <span className="text-white/60"> — {a.rationale}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {workspace.growthPlan ? (
            <section className={`${surface} p-5 text-sm text-white/75`}>
              <h2 className="text-lg font-semibold text-white">Growth plan</h2>
              <p className="mt-2">
                Status: <span className="text-white">{workspace.growthPlan.status}</span>
                {workspace.growthPlan.approvedAt
                  ? ` · approved ${new Date(workspace.growthPlan.approvedAt).toLocaleDateString('en-AU')}`
                  : ''}
              </p>
              {workspace.growthPlan.focusTitle ? (
                <p className="mt-2 font-medium text-white">{workspace.growthPlan.focusTitle}</p>
              ) : null}
              {workspace.growthPlan.focusDescription ? (
                <p className="mt-1 whitespace-pre-wrap">{workspace.growthPlan.focusDescription}</p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
