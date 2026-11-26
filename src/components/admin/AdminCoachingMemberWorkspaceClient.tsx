'use client';

import {
  BookOpen,
  Building2,
  ClipboardList,
  ListChecks,
  MapPinned,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AdminCoachingEmptyState,
  AdminCoachingField,
  AdminCoachingLoadingState,
  AdminCoachingMetricGrid,
  AdminCoachingNotice,
  AdminCoachingPageHeader,
  AdminCoachingPrimaryBtn,
  AdminCoachingSecondaryBtn,
  AdminCoachingSection,
  AdminCoachingShortcutNav,
  AdminCoachingStatusPill,
  AdminCoachingWorkflowRail,
  adminCoachingInset,
  adminCoachingLabel,
  adminCoachingPage,
  type AdminCoachingWorkflowStep,
} from '@/components/admin/admin-coaching-ui';
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

type Loaded = { userId: string; pick: number; workspace: Workspace };
type ChapterDraft = { userId: string; pick: number; chapterSlug: string; coachUserId: string };

function planTone(status: string): 'good' | 'draft' | 'neutral' {
  if (status === 'approved') return 'good';
  if (status === 'draft') return 'draft';
  return 'neutral';
}

function formatAu(iso: string | null, style: 'date' | 'datetime' = 'date') {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(
    'en-AU',
    style === 'datetime' ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }
  );
}

export function AdminCoachingMemberWorkspaceClient() {
  const pathname = usePathname();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState('');
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

  const selectedMember = members.find((m) => m.userId === selected);
  const chapterOptions = listCoachingChapterOptions();
  const activeChapterMeta = chapterOptions.find((c) => c.slug === chapterSlug);

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
        // network
      }
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
      if (data.members[0] && pickRef.current === 0) {
        pickRef.current += 1;
        setSelected(data.members[0].userId);
        setPick(pickRef.current);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    void loadWorkspace(selected, pickRef.current);
  }, [selected, pick, loadWorkspace]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  function selectMember(userId: string) {
    pickRef.current += 1;
    setNotice('');
    setError('');
    setSelected(userId);
    setPick(pickRef.current);
  }

  async function post(op: string, extra: Record<string, unknown> = {}) {
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
        // network
      }
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

  const workflowSteps = useMemo((): AdminCoachingWorkflowStep[] | null => {
    if (!workspace) return null;
    const chapterSaved =
      workspace.chapterSlug === chapterSlug && workspace.coachUserId === coachUserId;
    const hasBrief = Boolean(workspace.brief);
    const planStatus = workspace.growthPlan?.status;
    return [
      {
        id: 'chapter',
        label: 'Coach chapter',
        detail: activeChapterMeta?.title ?? workspace.chapterSlug,
        status: chapterSaved ? 'done' : 'current',
      },
      {
        id: 'brief',
        label: 'Onboarding brief',
        detail: hasBrief
          ? 'Ready to review'
          : workspace.hasOnboardingSnapshot
            ? 'Regenerate available'
            : 'Needs onboarding snapshot',
        status: !chapterSaved
          ? 'upcoming'
          : hasBrief
            ? 'done'
            : workspace.hasOnboardingSnapshot
              ? 'current'
              : 'blocked',
      },
      {
        id: 'plan',
        label: 'Growth plan',
        detail: planStatus ? `${planStatus} plan` : 'No plan row yet',
        status: !hasBrief
          ? 'upcoming'
          : planStatus === 'approved'
            ? 'done'
            : planStatus === 'draft'
              ? 'done'
              : hasBrief
                ? 'current'
                : 'upcoming',
      },
    ];
  }, [activeChapterMeta?.title, chapterSlug, coachUserId, workspace]);

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
    <div className={adminCoachingPage} data-testid="admin-coaching-member-workspace">
      <AdminCoachingPageHeader
        eyebrow="Coaching admin"
        title="Member workspace"
        description="Assign coach chapters, review the AI onboarding brief, and push suggested focus into a draft growth plan — without overwriting an approved plan."
        aside={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/admin/coaching-actions"
              className={AdminCoachingSecondaryBtn + ' min-h-10 text-xs sm:text-sm'}
            >
              <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
              Proposed actions
            </Link>
            <Link
              href="/admin/coaching-chapters"
              className={AdminCoachingSecondaryBtn + ' min-h-10 text-xs sm:text-sm'}
            >
              <MapPinned className="h-4 w-4 shrink-0" aria-hidden />
              Chapter registry
            </Link>
          </div>
        }
      />

      <AdminCoachingShortcutNav currentPath={pathname} />

      <div className={adminCoachingInset}>
        <label className={adminCoachingLabel} htmlFor="coaching-member-select">
          Coaching member
        </label>
        <select
          id="coaching-member-select"
          className={AdminCoachingField}
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

      {members.length === 0 ? (
        <AdminCoachingEmptyState
          title="No coaching subscribers yet"
          description="When Stripe coaching members appear, you can assign their chapter, regenerate the AI brief, and shape draft growth plans from here."
          action={
            <Link href="/admin/coaching-chapters" className={AdminCoachingSecondaryBtn}>
              <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
              Review chapter registry
            </Link>
          }
        />
      ) : null}

      {error ? <AdminCoachingNotice variant="error">{error}</AdminCoachingNotice> : null}
      {notice ? <AdminCoachingNotice variant="success">{notice}</AdminCoachingNotice> : null}

      {selected && !workspace && !error ? (
        <AdminCoachingLoadingState label="Loading member workspace…" />
      ) : null}

      {workspace && selectedMember ? (
        <div className={`${adminCoachingInset} space-y-3`}>
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-sky-500/10 text-sky-300">
              <Building2 className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-white">
                {workspace.businessName?.trim() || selectedMember.fullName || selectedMember.email}
              </p>
              <p className="mt-0.5 text-sm text-slate-400">{selectedMember.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminCoachingStatusPill
                tone={workspace.subscription?.status === 'active' ? 'good' : 'neutral'}
              >
                {workspace.subscription?.status ?? selectedMember.subscriptionStatus}
              </AdminCoachingStatusPill>
              <AdminCoachingStatusPill tone={workspace.hasOnboardingSnapshot ? 'draft' : 'warn'}>
                {workspace.hasOnboardingSnapshot ? 'Onboarding snapshot' : 'No snapshot'}
              </AdminCoachingStatusPill>
            </div>
          </div>
          <AdminCoachingMetricGrid
            items={[
              {
                id: 'since',
                label: 'Member since',
                value: formatAu(workspace.subscription?.startedAt ?? null) ?? '—',
              },
              {
                id: 'onboarding',
                label: 'Onboarding submitted',
                value: formatAu(workspace.onboardingSubmittedAt) ?? '—',
              },
              {
                id: 'brief',
                label: 'Brief generated',
                value: formatAu(workspace.briefGeneratedAt, 'datetime') ?? 'Not yet',
              },
            ]}
          />
        </div>
      ) : null}

      {workflowSteps ? (
        <div className={adminCoachingInset}>
          <p className={adminCoachingLabel}>Workflow</p>
          <div className="mt-3">
            <AdminCoachingWorkflowRail steps={workflowSteps} />
          </div>
        </div>
      ) : null}

      {workspace ? (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6">
            <AdminCoachingSection
              title="Coach chapter"
              description="GP-632 — chapter drives currency, pricing label, and coach id in the member portal."
              testId="admin-coaching-member-chapter"
            >
              <div className="space-y-4">
                <div>
                  <label className={adminCoachingLabel} htmlFor="chapter-slug">
                    Chapter
                  </label>
                  <select
                    id="chapter-slug"
                    className={AdminCoachingField}
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
                {activeChapterMeta ? (
                  <p className="text-sm text-slate-400">
                    <UserRound
                      className="mr-1.5 inline h-4 w-4 align-text-bottom text-sky-400/80"
                      aria-hidden
                    />
                    {activeChapterMeta.coachDisplayName}
                    <span className="text-slate-600"> · </span>
                    <span className="font-mono text-xs text-slate-500">{coachUserId}</span>
                    {!activeChapterMeta.allowCheckout ? (
                      <span className="ml-2 text-xs text-amber-200/90">(demo — no checkout)</span>
                    ) : null}
                  </p>
                ) : null}
                <button
                  type="button"
                  className={AdminCoachingPrimaryBtn}
                  disabled={busy || !chapter}
                  onClick={() => void post('save-chapter', { chapterSlug, coachUserId })}
                >
                  <Save className="h-4 w-4 shrink-0" aria-hidden />
                  Save chapter assignment
                </button>
              </div>
            </AdminCoachingSection>

            {workspace.growthPlan ? (
              <AdminCoachingSection
                title="Growth plan"
                description="Apply brief focus only updates draft plans."
                testId="admin-coaching-member-plan"
              >
                <div className="space-y-3">
                  <AdminCoachingStatusPill tone={planTone(workspace.growthPlan.status)}>
                    {workspace.growthPlan.status}
                  </AdminCoachingStatusPill>
                  {workspace.growthPlan.approvedAt ? (
                    <p className="text-xs text-slate-500">
                      Approved {formatAu(workspace.growthPlan.approvedAt)}
                    </p>
                  ) : null}
                  {workspace.growthPlan.focusTitle ? (
                    <p className="font-medium text-white">{workspace.growthPlan.focusTitle}</p>
                  ) : null}
                  {workspace.growthPlan.focusDescription ? (
                    <p className="text-sm whitespace-pre-wrap text-slate-400">
                      {workspace.growthPlan.focusDescription}
                    </p>
                  ) : null}
                </div>
              </AdminCoachingSection>
            ) : (
              <AdminCoachingSection title="Growth plan" description="No growth plan row yet.">
                <p className="text-sm text-slate-400">
                  Use &ldquo;Apply suggested focus to draft plan&rdquo; when a brief exists.
                </p>
              </AdminCoachingSection>
            )}
          </div>

          <AdminCoachingSection
            title="Onboarding brief"
            description="GP-628 (A1) — coach-facing brief from the onboarding packet."
            testId="admin-coaching-member-brief"
            actions={
              <>
                <button
                  type="button"
                  className={AdminCoachingSecondaryBtn}
                  disabled={busy || !workspace.hasOnboardingSnapshot}
                  title={
                    workspace.hasOnboardingSnapshot
                      ? undefined
                      : 'Member has no onboarding snapshot to rebuild from'
                  }
                  onClick={() => void post('regenerate-brief')}
                >
                  <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
                  Regenerate brief
                </button>
                <button
                  type="button"
                  className={AdminCoachingSecondaryBtn}
                  disabled={busy || !brief}
                  onClick={() => void post('apply-brief-plan')}
                >
                  <Target className="h-4 w-4 shrink-0" aria-hidden />
                  Apply suggested focus to draft plan
                </button>
              </>
            }
          >
            {workspace.briefGeneratedAt && brief ? (
              <p className="mb-4 text-xs text-slate-500">
                <Sparkles
                  className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-sky-400/80"
                  aria-hidden
                />
                Generated {formatAu(workspace.briefGeneratedAt, 'datetime')}
                {brief.source ? ` · ${brief.source}` : ''}
              </p>
            ) : (
              <p className="mb-4 text-sm text-slate-400">
                No brief yet — generated on onboarding submit, or regenerate when a snapshot exists.
              </p>
            )}
            {brief ? (
              <div
                className="space-y-5 border-t border-white/[0.06] pt-5 text-sm"
                data-testid="admin-coach-brief"
              >
                <p className="text-base leading-snug font-medium text-white">{brief.summary}</p>
                {brief.sections.map((s) => (
                  <div
                    key={s.heading}
                    className="rounded-xl border border-white/[0.06] bg-[#0a101c]/60 p-4"
                  >
                    <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-sky-300/90 uppercase">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden />
                      {s.heading}
                    </p>
                    <p className="mt-2 leading-relaxed whitespace-pre-wrap text-slate-300">
                      {s.body}
                    </p>
                  </div>
                ))}
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                  <p className={adminCoachingLabel}>Suggested focus</p>
                  <p className="mt-2 font-medium text-white">{brief.suggestedFocusTitle}</p>
                  <p className="mt-2 text-slate-300">{brief.suggestedFocusDescription}</p>
                </div>
                <ul className="space-y-2">
                  {brief.draftActions.map((a) => (
                    <li
                      key={a.title}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                    >
                      <span className="font-medium text-white">{a.title}</span>
                      <span className="text-slate-500"> — {a.rationale}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </AdminCoachingSection>
        </div>
      ) : null}
    </div>
  );
}
