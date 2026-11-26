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
 * A member's loaded workspace, tagged with the selection it was loaded for. The tag is the
 * selection (a counter that moves on every pick), not the member: coming back to A is a new
 * selection, so the workspace loaded for the first A is not shown or saved until A loads again.
 */
type Loaded = { generation: number; userId: string; workspace: Workspace };
/** The chapter assignment being edited, tagged with the selection it is for. */
type ChapterDraft = {
  generation: number;
  userId: string;
  chapterSlug: string;
  coachUserId: string;
};

export function AdminCoachingMemberWorkspaceClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState('');
  // GP-799: every piece of member data carries the member it belongs to, and is shown or saved
  // only while that member is selected. Picking member B never shows A's chapter or brief under
  // B, and a save can never post B's userId with A's chapter and coach.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<ChapterDraft | null>(null);
  // One counter for "which selection is this": bumped each time the admin picks a different
  // member (so A, B, A is three selections, not two). Every
  // load and save remembers the number it started under and is dropped if the number has moved,
  // so comparing member ids alone can never let an old request through after A, B, A.
  const generationRef = useRef(0);
  const [generation, setGeneration] = useState(0);
  // The selection a save is running for. Busy only counts on that selection, so a save for A
  // that never answers cannot lock B's buttons.
  const [busyGeneration, setBusyGeneration] = useState<number | null>(null);
  // Counts the admin's chapter edits, so a save answer can tell "nothing changed since I was
  // sent" from "the admin has picked something newer" and leave the newer pick alone.
  const chapterEditsRef = useRef(0);
  const busy = busyGeneration === generation;
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // The one test for "is this data for what the admin is looking at": the selection counter.
  const workspace = loaded && loaded.generation === generation ? loaded.workspace : null;
  const chapter = workspace && draft && draft.generation === generation ? draft : null;
  const chapterSlug = chapter?.chapterSlug ?? DEFAULT_COACHING_CHAPTER_SLUG;
  const coachUserId = chapter?.coachUserId ?? DEFAULT_COACHING_COACH.id;

  const showWorkspace = useCallback((userId: string, forGeneration: number, ws: Workspace) => {
    setLoaded({ generation: forGeneration, userId, workspace: ws });
    setDraft({
      generation: forGeneration,
      userId,
      chapterSlug: ws.chapterSlug,
      coachUserId: ws.coachUserId,
    });
  }, []);

  const loadWorkspace = useCallback(
    async (userId: string, startedGeneration: number, signal: AbortSignal) => {
      const stale = () => signal.aborted || generationRef.current !== startedGeneration;
      let res: Response;
      try {
        res = await fetch(
          `/api/admin/coaching/member-workspace?userId=${encodeURIComponent(userId)}`,
          { signal }
        );
      } catch (err) {
        // An abort is the admin leaving this member; anything else is a real failure.
        if (stale()) return;
        throw err;
      }
      if (stale()) return;
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        workspace?: Workspace;
      };
      // A response from a selection the admin has since left is dropped, error or not. This
      // check is after the second await too: the body can arrive after the switch.
      if (stale()) return;
      if (!res.ok || !data.workspace) {
        setError(data.detail ?? 'Could not load member.');
        return;
      }
      showWorkspace(userId, startedGeneration, data.workspace);
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
      if (data.members[0]) {
        setSelected((prev) => prev || data.members[0].userId);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    void loadWorkspace(selected, generationRef.current, controller.signal).catch(() => {
      // A failed request for the member still on screen shows an error; one for a member the
      // admin has left shows nothing.
      if (!controller.signal.aborted) setError('Could not load member.');
    });
    return () => controller.abort();
  }, [selected, loadWorkspace]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      // Unmount: a save still in flight must not touch state afterwards.
      mountedRef.current = false;
    };
  }, []);

  function selectMember(userId: string) {
    // Clear the last member's notice and error at once (a setState in the selection effect trips
    // react-hooks/set-state-in-effect). Their workspace is hidden by its member tag.
    if (userId !== selected) {
      generationRef.current += 1;
      setGeneration(generationRef.current);
    }
    setNotice('');
    setError('');
    setSelected(userId);
  }

  async function post(op: string, extra: Record<string, unknown> = {}) {
    // Only for the member whose workspace is on screen.
    const forUser = selected;
    if (!forUser || !workspace) return;
    const startedGeneration = generationRef.current;
    const editsAtStart = chapterEditsRef.current;
    const stale = () => !mountedRef.current || generationRef.current !== startedGeneration;
    setBusyGeneration(startedGeneration);
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
        // A network failure is a failed request, shown the same way (never an unhandled error).
      }
      // The admin moved to another selection while this was in flight (including away and
      // back): say nothing, and never replace what is now on screen with this old answer.
      if (stale()) return;
      if (!ok) {
        setError(data.detail ?? 'Request failed.');
        return;
      }
      if (data.workspace) {
        if (chapterEditsRef.current === editsAtStart) {
          showWorkspace(forUser, startedGeneration, data.workspace);
        } else {
          // Keep the admin's newer chapter pick; refresh only what the server owns.
          setLoaded({ generation: startedGeneration, userId: forUser, workspace: data.workspace });
        }
      }
      setNotice('Saved.');
    } finally {
      setBusyGeneration((current) => (current === startedGeneration ? null : current));
    }
  }

  const brief = workspace?.brief;
  const chapterOptions = listCoachingChapterOptions();

  function pickChapter(slug: string) {
    if (!chapter) return;
    chapterEditsRef.current += 1;
    const opt = chapterOptions.find((c) => c.slug === slug);
    setDraft({
      generation: chapter.generation,
      userId: chapter.userId,
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
