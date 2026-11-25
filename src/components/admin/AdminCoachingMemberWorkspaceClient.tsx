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

/** A member's loaded workspace, tagged with the member it is for. */
type Loaded = { userId: string; workspace: Workspace };
/** The chapter assignment being edited, tagged with the member it is for. */
type ChapterDraft = { userId: string; chapterSlug: string; coachUserId: string };

export function AdminCoachingMemberWorkspaceClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState('');
  // GP-799: every piece of member data carries the member it belongs to, and is shown or saved
  // only while that member is selected. Picking member B never shows A's chapter or brief under
  // B, and a save can never post B's userId with A's chapter and coach.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<ChapterDraft | null>(null);
  const selectedRef = useRef('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const workspace = loaded && loaded.userId === selected ? loaded.workspace : null;
  const chapter = workspace && draft && draft.userId === selected ? draft : null;
  const chapterSlug = chapter?.chapterSlug ?? DEFAULT_COACHING_CHAPTER_SLUG;
  const coachUserId = chapter?.coachUserId ?? DEFAULT_COACHING_COACH.id;

  const showWorkspace = useCallback((userId: string, ws: Workspace) => {
    setLoaded({ userId, workspace: ws });
    setDraft({ userId, chapterSlug: ws.chapterSlug, coachUserId: ws.coachUserId });
  }, []);

  const loadWorkspace = useCallback(
    async (userId: string) => {
      const res = await fetch(
        `/api/admin/coaching/member-workspace?userId=${encodeURIComponent(userId)}`
      );
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        workspace?: Workspace;
      };
      // A response for a member the admin has since left is dropped, error or not.
      if (selectedRef.current !== userId) return;
      if (!res.ok || !data.workspace) {
        setError(data.detail ?? 'Could not load member.');
        return;
      }
      showWorkspace(userId, data.workspace);
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
    selectedRef.current = selected;
    void (async () => {
      await loadWorkspace(selected);
    })();
  }, [selected, loadWorkspace]);

  function selectMember(userId: string) {
    // Clear the last member's notice and error at once (a setState in the selection effect trips
    // react-hooks/set-state-in-effect). Their workspace is hidden by its member tag.
    selectedRef.current = userId;
    setNotice('');
    setError('');
    setSelected(userId);
  }

  async function post(op: string, extra: Record<string, unknown> = {}) {
    // Only for the member whose workspace is on screen.
    const forUser = selected;
    if (!forUser || !workspace) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const res = await fetch('/api/admin/coaching/member-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: forUser, op, ...extra }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        workspace?: Workspace;
      };
      // The admin moved to another member while this was in flight: say nothing under them.
      if (selectedRef.current !== forUser) return;
      if (!res.ok) {
        setError(data.detail ?? 'Request failed.');
        return;
      }
      if (data.workspace) showWorkspace(forUser, data.workspace);
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
