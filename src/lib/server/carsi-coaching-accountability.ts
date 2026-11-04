/**
 * GP-635 (Coaching advantage A8) — accountability server rules.
 *
 * Storage is injected (`AccountabilityStore`) so the rules are tested without a database;
 * the Prisma store lives in `carsi-coaching-accountability-store.ts`. Isolation is structural:
 * - a member's KPIs are read and written by their own session id only;
 * - the coach is resolved from the member, never from the request;
 * - a coach only sees members whose plan names that coach, filtered here as well as in the
 *   store, so a store bug cannot widen what a coach sees.
 */
import {
  ACCOUNTABILITY_COPY,
  actionCompletionRate,
  applyCheckIn,
  applyKpiDefinitions,
  checkInStreak,
  coachAlerts,
  daysSilent,
  fortnightPeriodStart,
  isCheckInDue,
  kpiTrend,
  memberNudges,
  normaliseCheckInValues,
  normaliseKpiDefinitions,
  QUIET_NUDGE_DAYS,
  type AccountabilityAction,
  type AccountabilityKpi,
  type CoachAlert,
  type KpiTrendPoint,
  type MemberNudge,
  type PlanAccountability,
} from '@/lib/coaching-portal/accountability';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';

export type AccountabilityPlanRecord = {
  userId: string;
  goals: unknown[];
  accountability: PlanAccountability | null;
  /** Opaque compare-and-set token for the plan's current stored value. */
  version: string;
};

export type AccountabilityMemberRecord = {
  userId: string;
  /** Business name or full name, for the coach view only. */
  label: string;
  firstName?: string | null;
  email: string;
  emailOptOut: boolean;
  /** Active coaching subscription right now. */
  entitled: boolean;
  accountability: PlanAccountability;
  actions: AccountabilityAction[];
};

export interface AccountabilityStore {
  readPlan(userId: string): Promise<AccountabilityPlanRecord | null>;
  /**
   * Writes only if the stored plan still matches `expectedVersion` (null = no plan row yet,
   * so one is created). Returns false when someone else wrote first.
   */
  writeAccountability(
    userId: string,
    accountability: PlanAccountability,
    goals: unknown[],
    expectedVersion: string | null
  ): Promise<boolean>;
  listActions(userId: string): Promise<AccountabilityAction[]>;
  listMembers(filter: { coachId?: string }): Promise<AccountabilityMemberRecord[]>;
}

const WRITE_ATTEMPTS = 3;
/** A portal visit is recorded at most this often, so page loads do not churn the plan row. */
const VISIT_RECORD_INTERVAL_MS = 6 * 3_600_000;
/** "Already sent" marks older than this are dropped; every key embeds its own date. */
const NOTIFIED_RETENTION_MS = 120 * 86_400_000;

export function coachIdForMember(): string {
  // One coach until GP-632 (A5) adds member-to-coach assignment (same as GP-630).
  return DEFAULT_COACHING_COACH.id;
}

async function mutatePlan(
  store: AccountabilityStore,
  userId: string,
  change: (current: PlanAccountability | null) => PlanAccountability | null
): Promise<PlanAccountability | null> {
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt += 1) {
    const plan = await store.readPlan(userId);
    const next = change(plan?.accountability ?? null);
    if (!next) return plan?.accountability ?? null;
    const ok = await store.writeAccountability(
      userId,
      next,
      plan?.goals ?? [],
      plan?.version ?? null
    );
    if (ok) return next;
  }
  throw new Error('accountability_write_conflict');
}

// ---------------------------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------------------------

export type MemberAccountabilityView = {
  kpis: AccountabilityKpi[];
  period: string;
  checkInDue: boolean;
  currentValues: Record<string, number> | null;
  streak: number;
  completion: { done: number; total: number; percent: number };
  trend: KpiTrendPoint[];
  /**
   * Set once, on the first view after 14 or more quiet days, even when another portal page
   * recorded that visit a moment earlier (within the 6-hour visit window).
   */
  quiet: { daysSilent: number } | null;
  nudges: Array<Pick<MemberNudge, 'kind'> & { title?: string; dueDate?: string }>;
};

function memberView(
  acc: PlanAccountability | null,
  actions: AccountabilityAction[],
  now: Date,
  quiet: { daysSilent: number } | null
): MemberAccountabilityView {
  const period = fortnightPeriodStart(now);
  return {
    kpis: acc?.kpis ?? [],
    period,
    checkInDue: isCheckInDue(acc, now),
    currentValues: acc?.checkIns.find((c) => c.period === period)?.values ?? null,
    streak: acc ? checkInStreak(acc.checkIns, now) : 0,
    completion: actionCompletionRate(actions),
    trend: kpiTrend(acc),
    quiet,
    nudges: memberNudges({ accountability: acc, actions, now }).flatMap((n) =>
      n.kind === 'action_due_soon' || n.kind === 'action_overdue'
        ? [{ kind: n.kind, title: n.title, dueDate: n.dueDate }]
        : []
    ),
  };
}

function visitDue(acc: PlanAccountability, now: Date): boolean {
  const last = acc.lastSeenAt ? Date.parse(acc.lastSeenAt) : 0;
  return now.getTime() - last >= VISIT_RECORD_INTERVAL_MS;
}

/** The visit as it should be written, or null when one was recorded inside the window. */
function withVisit(current: PlanAccountability | null, now: Date): PlanAccountability | null {
  if (!current || !visitDue(current, now)) return null;
  const silent = daysSilent(current, now);
  const nowIso = now.toISOString();
  const { quietReturn: _previous, ...rest } = current;
  return {
    ...rest,
    lastSeenAt: nowIso,
    ...(silent >= QUIET_NUDGE_DAYS ? { quietReturn: { daysSilent: silent, at: nowIso } } : {}),
  };
}

/**
 * GP-677 — records that the member opened a coaching portal page, which resets the quiet clock
 * behind the day-14 nudge and the day-21 coach alert. Called from the portal layout, so every
 * member page counts. At most one write per 6-hour window, and the window is re-checked
 * against the latest plan inside the compare-and-set loop, so two pages loading together
 * write once. A member without accountability set up is left untouched.
 */
export async function recordPortalVisit(
  store: AccountabilityStore,
  userId: string,
  now: Date
): Promise<void> {
  const plan = await store.readPlan(userId);
  if (!plan?.accountability || !visitDue(plan.accountability, now)) return;
  await mutatePlan(store, userId, (current) => withVisit(current, now));
}

function quietOnArrival(acc: PlanAccountability, now: Date): { daysSilent: number } | null {
  const silent = daysSilent(acc, now);
  if (silent >= QUIET_NUDGE_DAYS) return { daysSilent: silent };
  // Another portal page already recorded this visit; the mark it left keeps the banner.
  const qr = acc.quietReturn;
  if (qr && now.getTime() - Date.parse(qr.at) < VISIT_RECORD_INTERVAL_MS) {
    return { daysSilent: qr.daysSilent };
  }
  return null;
}

/** The member's own accountability, then records this visit (which resets the quiet clock). */
export async function getMyAccountability(
  store: AccountabilityStore,
  userId: string,
  now: Date
): Promise<MemberAccountabilityView> {
  const [plan, actions] = await Promise.all([store.readPlan(userId), store.listActions(userId)]);
  const acc = plan?.accountability ?? null;
  let quiet: { daysSilent: number } | null = null;
  if (acc && (visitDue(acc, now) || acc.quietReturn)) {
    // Records the visit if one is due, and clears the "returned after a quiet spell" mark.
    // The banner is decided inside the compare-and-set loop, from the plan version this view
    // actually wrote, so two views loading together show it once (Codex r1 P2). A view that
    // finds nothing to write (the other view got there first) shows no banner.
    await mutatePlan(store, userId, (current) => {
      quiet = null;
      if (!current) return null;
      const visited = withVisit(current, now) ?? current;
      if (visited === current && !current.quietReturn) return null;
      quiet = quietOnArrival(current, now);
      const { quietReturn: _shown, ...rest } = visited;
      return rest;
    });
  }
  return memberView(acc, actions, now, quiet);
}

export type SaveOutcome =
  | { status: 'ok'; view: MemberAccountabilityView }
  | { status: 'invalid'; reason: string }
  | { status: 'no_kpis' };

export async function saveMyKpis(
  store: AccountabilityStore,
  userId: string,
  raw: unknown,
  now: Date
): Promise<SaveOutcome> {
  const defs = normaliseKpiDefinitions(raw);
  if (!defs.ok) return { status: 'invalid', reason: defs.reason };
  const acc = await mutatePlan(store, userId, (current) =>
    applyKpiDefinitions(current, defs.kpis, coachIdForMember(), now)
  );
  return { status: 'ok', view: memberView(acc, await store.listActions(userId), now, null) };
}

export async function submitMyCheckIn(
  store: AccountabilityStore,
  userId: string,
  rawValues: unknown,
  now: Date
): Promise<SaveOutcome> {
  // Values are checked against the KPIs of the exact plan version being written, inside the
  // compare-and-set loop. Checking against an earlier read let a concurrent KPI edit store
  // the check-in under ids the plan no longer has (Codex r1 P1).
  let outcome: SaveOutcome | null = null;
  const acc = await mutatePlan(store, userId, (current) => {
    if (!current || current.kpis.length === 0) {
      outcome = { status: 'no_kpis' };
      return null;
    }
    const values = normaliseCheckInValues(current.kpis, rawValues);
    if (!values.ok) {
      outcome = { status: 'invalid', reason: values.reason };
      return null;
    }
    outcome = null;
    return applyCheckIn(current, values.values, now);
  });
  if (outcome) return outcome;
  return { status: 'ok', view: memberView(acc, await store.listActions(userId), now, null) };
}

// ---------------------------------------------------------------------------------------------
// Coach
// ---------------------------------------------------------------------------------------------

export type CoachAlertView = CoachAlert & { userId: string; memberLabel: string };

export type CoachMemberView = {
  userId: string;
  memberLabel: string;
  daysSilent: number;
  streak: number;
  lastCheckInAt: string | null;
  completionPercent: number;
  kpis: Array<{ label: string; latest: number | null }>;
};

async function membersForCoach(
  store: AccountabilityStore,
  coachId: string
): Promise<AccountabilityMemberRecord[]> {
  const rows = await store.listMembers({ coachId });
  return rows.filter((m) => m.entitled && m.accountability.coachId === coachId);
}

export async function getCoachAccountabilityView(
  store: AccountabilityStore,
  coachId: string,
  now: Date
): Promise<{ alerts: CoachAlertView[]; members: CoachMemberView[] }> {
  const members = await membersForCoach(store, coachId);
  const alerts: CoachAlertView[] = [];
  const views: CoachMemberView[] = [];
  for (const m of members) {
    const acc = m.accountability;
    for (const a of coachAlerts({ accountability: acc, actions: m.actions, now })) {
      alerts.push({ ...a, userId: m.userId, memberLabel: m.label });
    }
    const latest = acc.checkIns.at(-1) ?? null;
    views.push({
      userId: m.userId,
      memberLabel: m.label,
      daysSilent: daysSilent(acc, now),
      streak: checkInStreak(acc.checkIns, now),
      lastCheckInAt: latest?.submittedAt ?? null,
      completionPercent: actionCompletionRate(m.actions).percent,
      kpis: acc.kpis.map((k) => ({ label: k.label, latest: latest?.values[k.id] ?? null })),
    });
  }
  views.sort((a, b) => b.daysSilent - a.daysSilent);
  return { alerts, members: views };
}

// ---------------------------------------------------------------------------------------------
// Scheduled run (nudges and coach alerts by e-mail)
// ---------------------------------------------------------------------------------------------

export type ScheduledMemberNudge = {
  userId: string;
  kind: MemberNudge['kind'];
  key: string;
  daysSilent?: number;
  actionId?: string;
};
export type ScheduledCoachAlert = {
  userId: string;
  kind: CoachAlert['kind'];
  key: string;
  daysSilent?: number;
  goalId?: string;
  blockedCount?: number;
};

export type AccountabilityMailer = {
  sendMemberNudges(member: AccountabilityMemberRecord, nudges: MemberNudge[]): Promise<boolean>;
  sendCoachAlerts(member: AccountabilityMemberRecord, alerts: CoachAlert[]): Promise<boolean>;
};

export type ScheduledRunResult = {
  dryRun: boolean;
  memberNudges: ScheduledMemberNudge[];
  coachAlerts: ScheduledCoachAlert[];
  planned: number;
  sent: number;
};

function pruneNotified(notified: Record<string, string>, now: Date): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(notified)) {
    if (now.getTime() - Date.parse(v) < NOTIFIED_RETENTION_MS) out[k] = v;
  }
  return out;
}

/**
 * Works out every nudge and coach alert due now that has not already been e-mailed.
 * With `mailer` null it is a dry run: it reports, sends nothing and writes nothing.
 * The report carries ids and kinds only, never a member's name, e-mail or action text.
 */
export async function runAccountabilitySchedule(
  store: AccountabilityStore,
  now: Date,
  mailer: AccountabilityMailer | null
): Promise<ScheduledRunResult> {
  const members = await membersForCoach(store, coachIdForMember());
  const result: ScheduledRunResult = {
    dryRun: mailer === null,
    memberNudges: [],
    coachAlerts: [],
    planned: 0,
    sent: 0,
  };

  for (const m of members) {
    const acc = m.accountability;
    const nudges = memberNudges({ accountability: acc, actions: m.actions, now }).filter(
      (n) => !acc.notified[n.key]
    );
    const alerts = coachAlerts({ accountability: acc, actions: m.actions, now }).filter(
      (a) => !acc.notified[a.key]
    );

    for (const n of nudges) {
      result.memberNudges.push({
        userId: m.userId,
        kind: n.kind,
        key: n.key,
        ...(n.kind === 'quiet' ? { daysSilent: n.daysSilent } : {}),
        ...(n.kind === 'action_due_soon' || n.kind === 'action_overdue'
          ? { actionId: n.actionId }
          : {}),
      });
    }
    for (const a of alerts) {
      result.coachAlerts.push({
        userId: m.userId,
        kind: a.kind,
        key: a.key,
        ...(a.kind === 'silent' ? { daysSilent: a.daysSilent } : {}),
        ...(a.kind === 'blocked_goal' ? { goalId: a.goalId, blockedCount: a.blockedCount } : {}),
      });
    }
    result.planned += nudges.length + alerts.length;

    if (!mailer) continue;

    const marked: string[] = [];
    if (nudges.length > 0 && !m.emailOptOut) {
      if (await mailer.sendMemberNudges(m, nudges)) {
        result.sent += 1;
        marked.push(...nudges.map((n) => n.key));
      }
    }
    if (alerts.length > 0) {
      if (await mailer.sendCoachAlerts(m, alerts)) {
        result.sent += 1;
        marked.push(...alerts.map((a) => a.key));
      }
    }
    if (marked.length > 0) {
      const stamp = now.toISOString();
      await mutatePlan(store, m.userId, (current) => {
        if (!current) return null;
        const notified = pruneNotified(current.notified, now);
        for (const key of marked) notified[key] = stamp;
        return { ...current, notified };
      });
    }
  }
  return result;
}

export { ACCOUNTABILITY_COPY };
