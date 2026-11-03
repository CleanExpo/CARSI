/**
 * GP-637 (Coaching advantage A10) — seeded partner-demo member.
 *
 * Builds and writes ONE clearly-marked demo member (email on the reserved `.invalid` TLD) with a
 * complete coaching journey: frozen onboarding packet, reviewed assessment, approved plan, six
 * actions in mixed states, one past session with decisions and one upcoming session with prep.
 *
 * Works on the CURRENT schema only. The "Demo US" chapter with USD pricing needs GP-632's coach
 * table and is kept as a draft in docs/coaching/partner-demo-chapter-DRAFT.md, not written here.
 *
 * Safety properties (each one has a test in partner-demo-seed.test.ts):
 *   - guarded: refuses unless CARSI_COACHING_DEMO_ENABLED === 'true' AND the database host is local
 *     (or the exact host is named on the command line);
 *   - demo-only: every write is keyed to the demo member's deterministic id;
 *   - idempotent: re-running leaves identical rows; rows a prospect added during a call are reset;
 *   - dry run: reports every write without performing any;
 *   - no password handling: a new demo login gets a `demo-locked:` marker that can never sign in
 *     and that guest checkout will not claim; a password an admin set later is kept on re-runs.
 */
import { createHash, randomUUID } from 'node:crypto';

import { COACHING_ASSESSMENT_SECTIONS } from '@/lib/coaching-portal/assessment-schema';
import type { CoachingOnboardingSnapshot } from '@/lib/coaching-portal/onboarding-snapshot';
import {
  PARTNER_DEMO_ASSESSMENT_ANSWERS,
  PARTNER_DEMO_COACH_NAME,
  PARTNER_DEMO_EMAIL_DOMAIN,
  PARTNER_DEMO_MEMBER,
  PARTNER_DEMO_PROFILE,
  PARTNER_DEMO_STATEMENTS,
  PARTNER_DEMO_WORKSPACE,
  isPartnerDemoEmail,
} from '@/lib/coaching-portal/partner-demo';
import type { CoachingActionStatus } from '@/lib/coaching-portal/types';

export { PARTNER_DEMO_EMAIL_DOMAIN, isPartnerDemoEmail };
export const PARTNER_DEMO_SEED_MEMBER_EMAIL = PARTNER_DEMO_MEMBER.email;
export const PARTNER_DEMO_LOCKED_PASSWORD_PREFIX = 'demo-locked:';
export const PARTNER_DEMO_ENABLED_ENV = 'CARSI_COACHING_DEMO_ENABLED';
export const PARTNER_DEMO_COACH_LABEL = PARTNER_DEMO_COACH_NAME;

const ID_NAMESPACE = 'carsi:gp-637:partner-demo:';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const DAY_MS = 24 * 60 * 60 * 1000;

/** Deterministic RFC 4122 version-5-shaped UUID for a demo row key. */
export function partnerDemoId(key: string): string {
  const h = createHash('sha256').update(ID_NAMESPACE + key).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const PARTNER_DEMO_SEED_USER_ID = partnerDemoId('member');

export type PartnerDemoGuardResult = { ok: true; host: string } | { ok: false; reason: string };

export function checkPartnerDemoSeedAllowed(input: {
  env: Record<string, string | undefined>;
  databaseUrl: string | undefined;
  allowHost?: string;
}): PartnerDemoGuardResult {
  if (input.env[PARTNER_DEMO_ENABLED_ENV] !== 'true') {
    return { ok: false, reason: `${PARTNER_DEMO_ENABLED_ENV} must be exactly "true"` };
  }
  let host: string;
  try {
    host = new URL(input.databaseUrl ?? '').hostname;
  } catch {
    return { ok: false, reason: 'DATABASE_URL is missing or not a URL' };
  }
  if (!host) return { ok: false, reason: 'DATABASE_URL has no host' };
  if (LOCAL_HOSTS.has(host)) return { ok: true, host };
  if (input.allowHost && input.allowHost === host) return { ok: true, host };
  return {
    ok: false,
    reason: `refusing non-local database host "${host}"; pass --allow-host=${host} only for a disposable preview database, never production`,
  };
}

// ---------------------------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------------------------

type ActionRow = {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: CoachingActionStatus;
  dueDate: Date;
  priority: string;
  assignedTo: string;
  progressNote: string | null;
  coachFeedback: string | null;
  sortOrder: number;
  completedAt: Date | null;
};

type SessionRow = {
  id: string;
  userId: string;
  scheduledAt: Date;
  durationMinutes: number;
  coachName: string;
  meetingUrl: string | null;
  status: string;
  prepResponsesJson: string | null;
  customerSummary: string | null;
  decisionsJson: string | null;
  followUpAt: Date | null;
};

export type PartnerDemoSeedPlan = ReturnType<typeof buildPartnerDemoSeedPlan>;

const MEMBER_NAME = PARTNER_DEMO_MEMBER.fullName;
const PROFILE = PARTNER_DEMO_PROFILE;

function assessmentAnswers(): Record<string, string> {
  const answers: Record<string, string> = { ...PARTNER_DEMO_ASSESSMENT_ANSWERS };
  // Fail loudly in tests if the assessment gains a question the demo does not answer.
  for (const section of COACHING_ASSESSMENT_SECTIONS) {
    for (const field of section.fields) {
      if (!(field.id in answers)) answers[field.id] = '';
    }
  }
  return answers;
}

export function buildPartnerDemoSeedPlan(now: Date) {
  const at = (days: number, hour = 0) => new Date(now.getTime() + days * DAY_MS + hour * 3_600_000);
  const userId = PARTNER_DEMO_SEED_USER_ID;
  const submittedAt = at(-21);
  const reviewedAt = at(-19);
  const approvedAt = at(-14);
  const responses = assessmentAnswers();

  const statements = { ...PARTNER_DEMO_STATEMENTS };

  const snapshot: CoachingOnboardingSnapshot = {
    version: 1,
    submittedAtIso: submittedAt.toISOString(),
    member: { fullName: MEMBER_NAME, email: PARTNER_DEMO_SEED_MEMBER_EMAIL },
    profile: PROFILE,
    assessmentResponses: responses,
    statements,
  };

  const action = (
    key: string,
    sortOrder: number,
    title: string,
    status: CoachingActionStatus,
    dueInDays: number,
    extra: Partial<ActionRow> = {}
  ): ActionRow => ({
    id: partnerDemoId(`action:${key}`),
    userId,
    title,
    description: `${title} (sample action).`,
    status,
    dueDate: at(dueInDays),
    priority: sortOrder <= 2 ? 'high' : 'medium',
    assignedTo: 'customer',
    progressNote: null,
    coachFeedback: null,
    sortOrder,
    completedAt: status === 'done' ? at(dueInDays - 1) : null,
    ...extra,
  });

  const actions: ActionRow[] = [
    action('follow-up-script', 1, 'Write a 60-second quote follow-up call script', 'done', -10, {
      coachFeedback: 'Good. Keep it under a minute and end on a booking question.',
    }),
    action('follow-up-48h', 2, 'Call every retail quote within 48 hours', 'in_progress', 5, {
      progressNote: '7 of 11 quotes called this fortnight.',
    }),
    action('add-ons', 3, 'List three add-ons to offer on every residential job', 'done', -6),
    action('crew-lead', 4, 'Pick the technician to train as crew lead', 'todo', 14),
    action('weekly-numbers', 5, 'Start a weekly cash-flow snapshot every Monday', 'in_progress', 3),
    action('panel-review', 6, 'Ask the insurance panel for a rate review', 'blocked', 7, {
      progressNote: 'Waiting on the panel manager to return from leave.',
    }),
  ];

  const sessions: SessionRow[] = [
    {
      id: partnerDemoId('session:past'),
      userId,
      scheduledAt: at(-7, 1),
      durationMinutes: 60,
      coachName: PARTNER_DEMO_COACH_LABEL,
      meetingUrl: null,
      status: 'completed',
      prepResponsesJson: JSON.stringify({
        wins: 'Follow-up script written and used on four quotes.',
        blockers: 'No time to train anyone while on the tools.',
      }),
      customerSummary:
        'Reviewed the follow-up script and the first week of calls. Agreed the owner protects two hours on Friday for quoting.',
      decisionsJson: JSON.stringify([
        'Call every retail quote within 48 hours, logged in the job app.',
        'Friday 1–3 pm is quoting time; no site work booked.',
        'Shortlist two technicians for the crew-lead role before the next session.',
      ]),
      followUpAt: at(-6),
    },
    {
      id: partnerDemoId('session:upcoming'),
      userId,
      scheduledAt: at(7, 1),
      durationMinutes: 60,
      coachName: PARTNER_DEMO_COACH_LABEL,
      meetingUrl: null,
      status: 'scheduled',
      prepResponsesJson: JSON.stringify({
        wins: '7 of 11 quotes followed up; two converted.',
        blockers: 'Insurance panel rate review is stalled.',
        focus: 'Choose the crew lead and agree a training plan.',
      }),
      customerSummary: null,
      decisionsJson: null,
      followUpAt: null,
    },
  ];

  return {
    user: {
      id: userId,
      email: PARTNER_DEMO_SEED_MEMBER_EMAIL,
      fullName: MEMBER_NAME,
      isActive: true,
      isVerified: true,
      role: 'student',
      emailOptOut: true,
    },
    subscription: {
      id: partnerDemoId('subscription'),
      userId,
      stripeCustomerId: null as string | null,
      stripeSubscriptionId: null as string | null,
      status: 'active',
      currentPeriodEnd: at(365),
      cancelAtPeriodEnd: false,
      horizontalSummary: PARTNER_DEMO_WORKSPACE.horizontalSummary,
      directionSummary: PARTNER_DEMO_WORKSPACE.directionSummary,
      sessionPrepNotes: PARTNER_DEMO_WORKSPACE.sessionPrepNotes,
      monthlyActionsJson: null as string | null,
    },
    profile: {
      id: partnerDemoId('profile'),
      userId,
      ...PROFILE,
      onboardingProblemStatement: statements.problemStatement,
      onboardingGoalStatement: statements.goalStatement,
      onboardingExtraNotes: statements.extraNotes,
      onboardingSubmittedAt: submittedAt,
      onboardingEmailsSentAt: submittedAt,
      onboardingSnapshotJson: JSON.stringify(snapshot),
      sessionPrepNotes: 'Bring the quote log and the crew-lead shortlist.',
      completedAt: submittedAt,
    },
    assessment: {
      id: partnerDemoId('assessment'),
      userId,
      status: 'reviewed',
      responsesJson: JSON.stringify(responses),
      submittedAt,
      reviewedAt,
      customerVisibleFeedback:
        'Strong mitigation operation. The growth constraint is the owner as the single point for quotes and calls.',
    },
    growthPlan: {
      id: partnerDemoId('growth-plan'),
      userId,
      status: 'approved',
      focusTitle: 'Turn retail quotes into bookings',
      focusDescription:
        'Every retail quote gets a call within 48 hours, and quoting moves into a protected Friday block.',
      focusTargetDate: at(70),
      businessDirection:
        'Quote-to-booking rhythm first, then a trained crew lead, then a second van.',
      goalsJson: JSON.stringify([
        { id: 'g1', title: 'One more direct job booked per week', targetDays: 90 },
        { id: 'g2', title: 'Crew lead trained and running jobs', targetDays: 180 },
      ]),
      latestGuidance: 'Keep the 48-hour call rule going before adding anything new.',
      approvedAt,
    },
    actions,
    sessions,
  };
}

// ---------------------------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------------------------

type Where = Record<string, unknown>;
type UpsertArgs = { where: Where; create: Record<string, unknown>; update: Record<string, unknown> };
type Delegate = {
  upsert(args: UpsertArgs): Promise<unknown>;
  deleteMany(args: { where: Where }): Promise<{ count: number }>;
};
type ManyRowDelegate = Delegate & {
  findMany(args: {
    where: Where;
    select?: Record<string, boolean>;
  }): Promise<{ id: string; userId: string }[]>;
};

/** The delegates the seed reads and writes (a Prisma client or an interactive-transaction client). */
export type PartnerDemoSeedDelegates = {
  lmsUser: Delegate & {
    findUnique(args: {
      where: { email: string } | { id: string };
      select?: Record<string, boolean>;
    }): Promise<{ id: string; email: string; hashedPassword: string } | null>;
  };
  carsiCoachingMonthlySubscription: Delegate;
  carsiCoachingBusinessProfile: Delegate;
  carsiCoachingAssessment: ManyRowDelegate;
  carsiCoachingGrowthPlan: Delegate;
  carsiCoachingAction: ManyRowDelegate;
  carsiCoachingSession: ManyRowDelegate;
};

/** The subset of the Prisma client the seed uses (the CLI passes the real client). */
export type PartnerDemoSeedDb = PartnerDemoSeedDelegates & {
  $transaction<T>(
    fn: (tx: PartnerDemoSeedDelegates) => Promise<T>,
    options?: { timeout?: number; maxWait?: number }
  ): Promise<T>;
};

export type PartnerDemoSeedOperation = {
  table: keyof PartnerDemoSeedDelegates;
  op: 'upsert' | 'deleteMany';
  id?: string;
  where: Where;
};

export type PartnerDemoSeedReport = {
  dryRun: boolean;
  userId: string;
  email: string;
  passwordState: 'locked-new' | 'kept-admin-set' | 'kept-locked' | 'relocked';
  operations: PartnerDemoSeedOperation[];
};

function stripKeys<T extends Record<string, unknown>>(row: T, keys: string[]) {
  const out: Record<string, unknown> = { ...row };
  for (const k of keys) delete out[k];
  return out;
}

const MANY_ROW_TABLES = ['carsiCoachingAssessment', 'carsiCoachingAction', 'carsiCoachingSession'] as const;

/**
 * Reads, refuses or plans, then (unless dry run) writes — all through `d`. When writing, `d` is an
 * interactive transaction, so the checks and every write commit together or not at all.
 */
async function seedWith(
  d: PartnerDemoSeedDelegates,
  plan: PartnerDemoSeedPlan,
  dryRun: boolean
): Promise<PartnerDemoSeedReport> {
  const userId = plan.user.id;

  const byEmail = await d.lmsUser.findUnique({
    where: { email: plan.user.email },
    select: { id: true, email: true, hashedPassword: true },
  });
  if (byEmail && byEmail.id !== userId) {
    throw new Error(
      `partner demo seed: ${plan.user.email} belongs to a different account (${byEmail.id}); refusing to touch it`
    );
  }
  const byId = byEmail
    ? byEmail
    : await d.lmsUser.findUnique({
        where: { id: userId },
        select: { id: true, email: true, hashedPassword: true },
      });
  if (byId && byId.email !== plan.user.email) {
    throw new Error('partner demo seed: demo id is held by a non-demo email; refusing');
  }

  // A planned row id must be free or already the demo member's. Ids are deterministic, so refuse
  // loudly rather than ever touching a row another member owns (GP-637 review r1, P1).
  const plannedIds: Record<(typeof MANY_ROW_TABLES)[number], string[]> = {
    carsiCoachingAssessment: [plan.assessment.id],
    carsiCoachingAction: plan.actions.map((a) => a.id),
    carsiCoachingSession: plan.sessions.map((s) => s.id),
  };
  for (const table of MANY_ROW_TABLES) {
    const foreign = await d[table].findMany({
      where: { id: { in: plannedIds[table] }, userId: { not: userId } },
      select: { id: true, userId: true },
    });
    if (foreign.length > 0) {
      throw new Error(
        `partner demo seed: ${table} id ${foreign[0].id} is owned by another member (${foreign[0].userId}); refusing to touch it`
      );
    }
  }

  const current = byId?.hashedPassword ?? '';
  const adminSet = current.startsWith('$2');
  const alreadyLocked = current.startsWith(PARTNER_DEMO_LOCKED_PASSWORD_PREFIX);
  // Keep an existing lock marker so a re-run is a no-op; anything else that is not an
  // admin-set bcrypt hash (e.g. a provisional or JWT placeholder) is replaced by a lock.
  const lockedHash = alreadyLocked
    ? current
    : `${PARTNER_DEMO_LOCKED_PASSWORD_PREFIX}${randomUUID()}`;
  const passwordState: PartnerDemoSeedReport['passwordState'] = !byId
    ? 'locked-new'
    : adminSet
      ? 'kept-admin-set'
      : alreadyLocked
        ? 'kept-locked'
        : 'relocked';

  const ops: { meta: PartnerDemoSeedOperation; run: () => Promise<unknown> }[] = [];
  const upsert = (table: keyof PartnerDemoSeedDelegates, args: UpsertArgs, id?: string) =>
    ops.push({
      meta: { table, op: 'upsert', id, where: args.where },
      run: () => (d[table] as Delegate).upsert(args),
    });
  const deleteMany = (table: keyof PartnerDemoSeedDelegates, where: Where) =>
    ops.push({
      meta: { table, op: 'deleteMany', where },
      run: () => (d[table] as Delegate).deleteMany({ where }),
    });

  const userUpdate: Record<string, unknown> = stripKeys(plan.user, ['id', 'email']);
  if (!adminSet) userUpdate.hashedPassword = lockedHash;
  upsert(
    'lmsUser',
    {
      where: { id: userId },
      create: { ...plan.user, hashedPassword: lockedHash },
      update: userUpdate,
    },
    userId
  );

  const perUser = (
    table: keyof PartnerDemoSeedDelegates,
    row: Record<string, unknown> & { id: string; userId: string }
  ) =>
    upsert(table, {
      where: { userId },
      create: row,
      update: stripKeys(row, ['id', 'userId']),
    });
  perUser('carsiCoachingMonthlySubscription', plan.subscription);
  perUser('carsiCoachingBusinessProfile', plan.profile);
  perUser('carsiCoachingGrowthPlan', plan.growthPlan);

  const perRow = (
    table: (typeof MANY_ROW_TABLES)[number],
    rows: (Record<string, unknown> & { id: string; userId: string })[]
  ) => {
    deleteMany(table, { userId, id: { notIn: rows.map((r) => r.id) } });
    for (const row of rows) {
      // Matching on id AND the demo member means a row someone else owns can never be updated:
      // it does not match, the create then collides on the id, and the transaction rolls back.
      upsert(
        table,
        { where: { id: row.id, userId }, create: row, update: stripKeys(row, ['id', 'userId']) },
        row.id
      );
    }
  };
  perRow('carsiCoachingAssessment', [plan.assessment]);
  perRow('carsiCoachingAction', plan.actions);
  perRow('carsiCoachingSession', plan.sessions);

  if (!dryRun) {
    for (const op of ops) await op.run();
  }

  return {
    dryRun,
    userId,
    email: plan.user.email,
    passwordState,
    operations: ops.map((o) => o.meta),
  };
}

export async function applyPartnerDemoSeed(
  db: PartnerDemoSeedDb,
  plan: PartnerDemoSeedPlan,
  opts: { dryRun: boolean }
): Promise<PartnerDemoSeedReport> {
  if (plan.user.id !== PARTNER_DEMO_SEED_USER_ID || !isPartnerDemoEmail(plan.user.email)) {
    throw new Error('partner demo seed: plan is not the demo member');
  }
  if (opts.dryRun) return seedWith(db, plan, true);
  return db.$transaction((tx) => seedWith(tx, plan, false), { timeout: 30_000, maxWait: 10_000 });
}
