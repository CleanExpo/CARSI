/**
 * GP-635 (Coaching advantage A8) — accountability on autopilot.
 *
 * Pure rules only (no database, no clock): every function takes `now`, so the day-14 nudge
 * and day-21 coach alert are tested by shifting time, not by waiting.
 *
 * Storage: no new table or column. A member's KPIs and check-ins live on their growth plan,
 * inside `carsi_coaching_growth_plans.goals_json`. That column held a bare goals array; it
 * now holds `{ goals, accountability }` once accountability is set, and a plan without
 * accountability is written back as the original bare array, byte for byte.
 */

export const ACCOUNTABILITY_KPI_MIN = 3;
export const ACCOUNTABILITY_KPI_MAX = 5;
export const KPI_LABEL_MIN = 2;
export const KPI_LABEL_MAX = 60;
export const KPI_VALUE_MAX = 1_000_000_000;
export const FORTNIGHT_DAYS = 14;
export const QUIET_NUDGE_DAYS = 14;
export const COACH_SILENT_DAYS = 21;
export const DUE_SOON_DAYS = 2;
export const BLOCKED_PER_GOAL_ALERT = 2;
/** About a year of fortnights; older check-ins drop off so the plan row stays small. */
export const CHECKIN_HISTORY_MAX = 26;

const DAY_MS = 86_400_000;
/** Fortnights are fixed 14-day windows counted from Monday 12 January 2026 (Brisbane). */
const FORTNIGHT_EPOCH_DAY = Date.UTC(2026, 0, 12) / DAY_MS;
const PERIOD_TIME_ZONE = 'Australia/Brisbane';

export type AccountabilityKpi = { id: string; label: string };

export type KpiCheckIn = {
  /** First day (YYYY-MM-DD, Brisbane) of the fortnight this check-in belongs to. */
  period: string;
  submittedAt: string;
  values: Record<string, number>;
};

export type PlanAccountability = {
  coachId: string;
  startedAt: string;
  kpis: AccountabilityKpi[];
  checkIns: KpiCheckIn[];
  /** Last time the member opened their coaching portal (recorded at most once a day). */
  lastSeenAt: string | null;
  /** Reminder keys already e-mailed, so a scheduled re-run never repeats one. */
  notified: Record<string, string>;
};

export type GrowthPlanGoalsDoc = {
  goals: unknown[];
  accountability: PlanAccountability | null;
};

export type AccountabilityAction = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  goalId: string | null;
  assignedTo: string;
  completedAt: Date | null;
};

export type MemberNudge =
  | { kind: 'quiet'; daysSilent: number; key: string }
  | { kind: 'checkin_due'; period: string; key: string }
  | { kind: 'action_due_soon'; actionId: string; title: string; dueDate: string; key: string }
  | { kind: 'action_overdue'; actionId: string; title: string; dueDate: string; key: string };

export type CoachAlert =
  | { kind: 'silent'; daysSilent: number; key: string }
  | { kind: 'blocked_goal'; goalId: string; blockedCount: number; key: string };

// ---------------------------------------------------------------------------------------------
// goals_json
// ---------------------------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function isIso(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

function parseAccountability(raw: unknown): PlanAccountability | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.coachId !== 'string' || !raw.coachId || !isIso(raw.startedAt)) return null;
  if (!Array.isArray(raw.kpis) || !Array.isArray(raw.checkIns)) return null;
  const kpis = raw.kpis.filter(
    (k): k is AccountabilityKpi =>
      isRecord(k) && typeof k.id === 'string' && typeof k.label === 'string'
  );
  const checkIns = raw.checkIns
    .filter(
      (c): c is KpiCheckIn =>
        isRecord(c) &&
        typeof c.period === 'string' &&
        isIso(c.submittedAt) &&
        isRecord(c.values) &&
        Object.values(c.values).every((n) => typeof n === 'number' && Number.isFinite(n))
    )
    .map((c) => ({ period: c.period, submittedAt: c.submittedAt, values: { ...c.values } }));
  const notified: Record<string, string> = {};
  if (isRecord(raw.notified)) {
    for (const [k, v] of Object.entries(raw.notified)) if (isIso(v)) notified[k] = v;
  }
  return {
    coachId: raw.coachId,
    startedAt: raw.startedAt,
    kpis: kpis.map((k) => ({ id: k.id, label: k.label })),
    checkIns,
    lastSeenAt: isIso(raw.lastSeenAt) ? raw.lastSeenAt : null,
    notified,
  };
}

export function parseGrowthPlanGoals(json: string | null | undefined): GrowthPlanGoalsDoc {
  if (!json?.trim()) return { goals: [], accountability: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { goals: [], accountability: null };
  }
  if (Array.isArray(parsed)) return { goals: parsed, accountability: null };
  if (!isRecord(parsed)) return { goals: [], accountability: null };
  return {
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    accountability: parseAccountability(parsed.accountability),
  };
}

export function serialiseGrowthPlanGoals(doc: GrowthPlanGoalsDoc): string {
  if (!doc.accountability) return JSON.stringify(doc.goals);
  return JSON.stringify({ goals: doc.goals, accountability: doc.accountability });
}

// ---------------------------------------------------------------------------------------------
// KPIs and check-ins
// ---------------------------------------------------------------------------------------------

function slug(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'kpi'
  );
}

export function normaliseKpiDefinitions(
  raw: unknown
): { ok: true; kpis: AccountabilityKpi[] } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: 'not_a_list' };
  if (raw.length < ACCOUNTABILITY_KPI_MIN || raw.length > ACCOUNTABILITY_KPI_MAX) {
    return { ok: false, reason: 'count' };
  }
  const seenLabels = new Set<string>();
  const seenIds = new Set<string>();
  const kpis: AccountabilityKpi[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.label !== 'string') return { ok: false, reason: 'label' };
    const label = item.label.replace(/\s+/g, ' ').trim();
    if (label.length < KPI_LABEL_MIN || label.length > KPI_LABEL_MAX) {
      return { ok: false, reason: 'label' };
    }
    const lower = label.toLowerCase();
    if (seenLabels.has(lower)) return { ok: false, reason: 'duplicate' };
    seenLabels.add(lower);
    let id =
      typeof item.id === 'string' && /^[a-z0-9-]{1,48}$/.test(item.id)
        ? item.id
        : `kpi-${slug(label)}`;
    for (let n = 2; seenIds.has(id); n += 1) id = `kpi-${slug(label)}-${n}`;
    seenIds.add(id);
    kpis.push({ id, label });
  }
  return { ok: true, kpis };
}

/** Sets (or replaces) the plan's KPIs. Setting KPIs counts as activity. */
export function applyKpiDefinitions(
  current: PlanAccountability | null,
  kpis: AccountabilityKpi[],
  coachId: string,
  now: Date
): PlanAccountability {
  const nowIso = now.toISOString();
  return {
    coachId: current?.coachId ?? coachId,
    startedAt: current?.startedAt ?? nowIso,
    kpis: kpis.map((k) => ({ ...k })),
    checkIns: current?.checkIns ?? [],
    lastSeenAt: nowIso,
    notified: current?.notified ?? {},
  };
}

export function normaliseCheckInValues(
  kpis: AccountabilityKpi[],
  raw: unknown
): { ok: true; values: Record<string, number> } | { ok: false; reason: string } {
  if (!isRecord(raw) || kpis.length === 0) return { ok: false, reason: 'values' };
  const values: Record<string, number> = {};
  for (const k of kpis) {
    const v = raw[k.id];
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
    if (!Number.isFinite(n) || n < 0 || n > KPI_VALUE_MAX) return { ok: false, reason: k.id };
    values[k.id] = Math.round(n * 100) / 100;
  }
  return { ok: true, values };
}

export function applyCheckIn(
  current: PlanAccountability,
  values: Record<string, number>,
  now: Date
): PlanAccountability {
  const period = fortnightPeriodStart(now);
  const nowIso = now.toISOString();
  const others = current.checkIns.filter((c) => c.period !== period);
  const checkIns = [...others, { period, submittedAt: nowIso, values: { ...values } }]
    .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0))
    .slice(-CHECKIN_HISTORY_MAX);
  return { ...current, checkIns, lastSeenAt: nowIso };
}

// ---------------------------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------------------------

const periodFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: PERIOD_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function localDayNumber(at: Date): number {
  const [y, m, d] = periodFormatter.format(at).split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / DAY_MS;
}

function fortnightIndex(at: Date): number {
  return Math.floor((localDayNumber(at) - FORTNIGHT_EPOCH_DAY) / FORTNIGHT_DAYS);
}

function periodForIndex(index: number): string {
  const day = FORTNIGHT_EPOCH_DAY + index * FORTNIGHT_DAYS;
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function fortnightPeriodStart(at: Date): string {
  return periodForIndex(fortnightIndex(at));
}

/** Consecutive fortnights with a check-in, ending this fortnight (or last, if this one is open). */
export function checkInStreak(checkIns: KpiCheckIn[], now: Date): number {
  const periods = new Set(checkIns.map((c) => c.period));
  let index = fortnightIndex(now);
  if (!periods.has(periodForIndex(index))) index -= 1;
  let streak = 0;
  while (periods.has(periodForIndex(index))) {
    streak += 1;
    index -= 1;
  }
  return streak;
}

export function isCheckInDue(acc: PlanAccountability | null, now: Date): boolean {
  if (!acc || acc.kpis.length === 0) return false;
  const period = fortnightPeriodStart(now);
  return !acc.checkIns.some((c) => c.period === period);
}

export function lastActivityAt(acc: PlanAccountability): Date {
  let latest = Date.parse(acc.startedAt);
  if (acc.lastSeenAt) latest = Math.max(latest, Date.parse(acc.lastSeenAt));
  for (const c of acc.checkIns) latest = Math.max(latest, Date.parse(c.submittedAt));
  return new Date(latest);
}

export function daysSilent(acc: PlanAccountability, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - lastActivityAt(acc).getTime()) / DAY_MS));
}

// ---------------------------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------------------------

function memberOwned(actions: AccountabilityAction[]): AccountabilityAction[] {
  return actions.filter((a) => a.assignedTo === 'customer');
}

export function actionCompletionRate(actions: AccountabilityAction[]): {
  done: number;
  total: number;
  percent: number;
} {
  const own = memberOwned(actions);
  const done = own.filter((a) => a.status === 'done').length;
  const total = own.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export type KpiTrendPoint = { period: string } & Record<string, number | string>;

export function kpiTrend(acc: PlanAccountability | null): KpiTrendPoint[] {
  if (!acc) return [];
  const ids = new Set(acc.kpis.map((k) => k.id));
  return acc.checkIns.map((c) => {
    const point: KpiTrendPoint = { period: c.period };
    for (const [id, v] of Object.entries(c.values)) if (ids.has(id)) point[id] = v;
    return point;
  });
}

// ---------------------------------------------------------------------------------------------
// Nudges and alerts
// ---------------------------------------------------------------------------------------------

function isOpen(a: AccountabilityAction): boolean {
  return a.status === 'todo' || a.status === 'in_progress';
}

export function memberNudges(input: {
  accountability: PlanAccountability | null;
  actions: AccountabilityAction[];
  now: Date;
}): MemberNudge[] {
  const { accountability: acc, actions, now } = input;
  if (!acc) return [];
  const out: MemberNudge[] = [];

  const silent = daysSilent(acc, now);
  if (silent >= QUIET_NUDGE_DAYS) {
    // One quiet nudge per spell of silence: the key is the day the silence began.
    const since = lastActivityAt(acc).toISOString().slice(0, 10);
    out.push({ kind: 'quiet', daysSilent: silent, key: `quiet:${since}` });
  }

  if (isCheckInDue(acc, now)) {
    const period = fortnightPeriodStart(now);
    out.push({ kind: 'checkin_due', period, key: `checkin:${period}` });
  }

  const nowMs = now.getTime();
  for (const a of memberOwned(actions)) {
    if (!isOpen(a) || !a.dueDate) continue;
    const due = a.dueDate.getTime();
    const dueIso = a.dueDate.toISOString();
    if (due < nowMs) {
      out.push({
        kind: 'action_overdue',
        actionId: a.id,
        title: a.title,
        dueDate: dueIso,
        key: `overdue:${a.id}:${dueIso.slice(0, 10)}`,
      });
    } else if (due - nowMs <= DUE_SOON_DAYS * DAY_MS) {
      out.push({
        kind: 'action_due_soon',
        actionId: a.id,
        title: a.title,
        dueDate: dueIso,
        key: `due:${a.id}:${dueIso.slice(0, 10)}`,
      });
    }
  }
  return out;
}

export function coachAlerts(input: {
  accountability: PlanAccountability | null;
  actions: AccountabilityAction[];
  now: Date;
}): CoachAlert[] {
  const { accountability: acc, actions, now } = input;
  if (!acc) return [];
  const out: CoachAlert[] = [];

  const silent = daysSilent(acc, now);
  if (silent >= COACH_SILENT_DAYS) {
    const since = lastActivityAt(acc).toISOString().slice(0, 10);
    out.push({ kind: 'silent', daysSilent: silent, key: `coach-silent:${since}` });
  }

  const blockedByGoal = new Map<string, number>();
  for (const a of memberOwned(actions)) {
    if (a.status !== 'blocked' || !a.goalId) continue;
    blockedByGoal.set(a.goalId, (blockedByGoal.get(a.goalId) ?? 0) + 1);
  }
  for (const [goalId, blockedCount] of blockedByGoal) {
    if (blockedCount >= BLOCKED_PER_GOAL_ALERT) {
      out.push({ kind: 'blocked_goal', goalId, blockedCount, key: `coach-blocked:${goalId}` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Copy (Australian English; no certification, accreditation or credit claims)
// ---------------------------------------------------------------------------------------------

export const ACCOUNTABILITY_COPY = {
  navLabel: 'Progress',
  pageTitle: 'Progress and check-ins',
  pageIntro:
    'Every fortnight, enter the numbers you track. It takes under a minute, and your coach sees how things are moving without you waiting for a session.',
  kpiSetupTitle: 'Choose the numbers you track',
  kpiSetupIntro:
    'Pick three to five numbers that show your business moving, such as quotes sent, jobs won or new Google reviews.',
  kpiSave: 'Save my numbers',
  checkInTitle: 'This fortnight’s check-in',
  checkInDue: 'Your fortnightly check-in is open. Enter this fortnight’s numbers.',
  checkInDone: 'Check-in done for this fortnight. Thank you.',
  checkInSubmit: 'Send check-in',
  streakLabel: 'Check-in streak',
  streakUnit: 'fortnights in a row',
  completionLabel: 'Actions completed',
  trendTitle: 'Your numbers over time',
  trendEmpty: 'Your trend appears after your first check-in.',
  quietTitle: 'Welcome back',
  quietBody: (days: number) =>
    `It has been ${days} days since we last heard from you. A quick check-in keeps your plan on track.`,
  homeCardTitle: 'Fortnightly check-in',
  homeCardCta: 'Open check-in',
  email: {
    quietSubject: 'A quick check-in on your coaching plan',
    quietBody: (firstName: string, days: number) =>
      `Hi ${firstName}, it has been ${days} days since your last visit or check-in. Your coaching plan works best with a quick fortnightly update. It takes under a minute.`,
    checkInSubject: 'Your fortnightly check-in is open',
    checkInBody: (firstName: string) =>
      `Hi ${firstName}, your fortnightly check-in is open. Enter your numbers so your coach can see how things are tracking.`,
    actionsSubject: 'Coaching actions due soon',
    actionsIntro: (firstName: string) =>
      `Hi ${firstName}, these actions on your coaching plan are due soon or overdue:`,
    coachSubject: 'Coaching member needs attention',
    coachSilent: (label: string, days: number) =>
      `${label} has not visited the portal or checked in for ${days} days.`,
    coachBlocked: (label: string, count: number) =>
      `${label} has ${count} blocked actions on the same goal.`,
    cta: 'Open my coaching workspace',
    coachCta: 'Open the accountability view',
    footer:
      'You receive this because you have an active CARSI Business Coaching plan. Reply to this e-mail if you would like these reminders turned off.',
  },
  coach: {
    title: 'Member accountability',
    intro:
      'Members who have gone quiet for 21 days, or who have two blocked actions on the same goal. Everyone else is on autopilot.',
    noAlerts: 'No member needs attention right now.',
    membersTitle: 'All members with check-ins set up',
  },
} as const;
