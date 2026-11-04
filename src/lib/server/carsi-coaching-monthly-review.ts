/**
 * GP-629 (Coaching advantage A2): AI monthly review, server side.
 *
 * The coach generates a review before the member's next session, edits it, and approves it.
 * Until approval everything is held in coach-only rows (see `monthly-review.ts` for the draft
 * mechanism), so nothing reaches the member. Approval publishes the actions as `todo` on the
 * member's board and writes the plan's `latest_guidance`, which the member's Home already shows
 * (in-app notification; no email is sent).
 *
 * AI: CARSI's provider of record, OpenRouter (same wiring as review-reply-draft.ts). When it is not
 * configured or fails, the review still generates from the board alone.
 */
import {
  buildMonthInReview,
  buildMonthlyReviewMessages,
  composeMonthlyReviewDraft,
  MONTHLY_DRAFT_STATUS,
  MONTHLY_REVIEW_APPROVED_STATUS,
  parsePlanGoals,
  parseSessionPrep,
  REVIEW_GOAL_PREFIX,
  validateCoachEdits,
  type ChatMessage,
  type DraftAction,
  type MonthInReview,
  type PlanGoal,
} from '@/lib/coaching-portal/monthly-review';
import { OpenRouterClient } from '@/lib/openrouter/client';
import { resolveOpenRouterConfig } from '@/lib/openrouter/provider';
import { prisma } from '@/lib/prisma';
import { importLegacyActionsFromSubscriptionJson } from '@/lib/server/carsi-coaching-actions-store';
import { readCoachingSessionPrepNotes } from '@/lib/server/carsi-coaching-session-prep';

const MODEL_TIMEOUT_MS = 45_000;
const MODEL_MAX_TOKENS = 1_400;

export type MonthlyReviewRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  goalId: string | null;
  priority: string | null;
  dueDate: Date | null;
  progressNote: string | null;
  assignedTo: string;
  sortOrder: number;
};

export type NewMonthlyReviewRow = {
  title: string;
  description: string | null;
  status: string;
  goalId: string | null;
  priority: string | null;
  dueDate: Date | null;
  assignedTo: 'customer' | 'coach';
  sortOrder: number;
};

export type MonthlyReviewMember = {
  memberName: string;
  businessName: string;
  focusTitle: string | null;
  latestGuidance: string | null;
  goalsJson: string | null;
  prepNotes: string;
  nextSession: { id: string; scheduledAt: Date; prepResponsesJson: string | null } | null;
};

export type MonthlyReviewStore = {
  /** Runs fn with this member's coaching writes serialised (row lock on lms_users). */
  withMemberLock<T>(userId: string, fn: (store: MonthlyReviewStore) => Promise<T>): Promise<T>;
  loadMember(userId: string, now: Date): Promise<MonthlyReviewMember>;
  listRows(userId: string): Promise<MonthlyReviewRow[]>;
  /** Deletes this member's rows with status 'draft' (draft actions and the draft review record). */
  deleteDraftRows(userId: string): Promise<void>;
  createRows(userId: string, rows: NewMonthlyReviewRow[]): Promise<void>;
  setLatestGuidance(userId: string, guidance: string): Promise<void>;
  /**
   * Brings the member's legacy `monthly_actions_json` onto the board if they have no action rows
   * yet. The portal does this on first visit, but only while the member has zero rows, so a draft
   * written first would suppress it for good (review f037d802 P1).
   */
  importLegacyActions(userId: string): Promise<void>;
};

/** What is stored as JSON in the review record's description. */
type ReviewRecord = {
  version: 1;
  sessionId: string | null;
  sessionAt: string | null;
  generatedAt: string;
  source: 'model' | 'fallback';
  model: string | null;
  review: MonthInReview;
  guidance: string;
};

export type MonthlyReviewView = {
  status: 'none' | 'draft';
  nextSession: { id: string; scheduledAt: string } | null;
  goals: PlanGoal[];
  currentGuidance: string | null;
  generatedAt: string | null;
  source: 'model' | 'fallback' | null;
  review: MonthInReview | null;
  guidance: string;
  actions: DraftAction[];
  /**
   * The draft's version. Changes on every generate and save (the review record row is recreated).
   * Save, approve and discard must send back the revision they were looking at (review r3).
   */
  revision: string | null;
  /** True when the draft was made for a session that is no longer the member's next session. */
  stale: boolean;
};

export type ModelDraftFn = (
  messages: ChatMessage[]
) => Promise<{ text: string; model: string } | null>;

/** Calls OpenRouter. Null when it is not configured or the call fails (the board fallback runs). */
export const draftMonthlyReviewWithOpenRouter: ModelDraftFn = async (messages) => {
  const cfg = resolveOpenRouterConfig();
  if (!cfg.configured) return null;
  try {
    const client = new OpenRouterClient({
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
      referer: cfg.referer,
      appTitle: cfg.appTitle,
      timeoutMs: MODEL_TIMEOUT_MS,
    });
    const response = await client.chat({
      model: cfg.model,
      max_tokens: MODEL_MAX_TOKENS,
      messages,
    });
    const text = OpenRouterClient.extractText(response).trim();
    return text ? { text, model: cfg.model } : null;
  } catch (e) {
    console.error('[coaching-monthly-review] model call failed', e);
    return null;
  }
};

function isReviewRecord(row: MonthlyReviewRow): boolean {
  return Boolean(row.goalId?.startsWith(REVIEW_GOAL_PREFIX));
}

/** Thrown when the coach-side state changed while a draft was being written (HTTP 409). */
export class MonthlyReviewConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonthlyReviewConflictError';
  }
}

/**
 * The coach-side state a generation is based on: every draft row and review record, with status.
 * Compared again under the member lock, so an approve, save or discard that lands while the model
 * is drafting makes the slow generation stand down instead of overwriting or resurrecting a draft.
 */
function coachStateFingerprint(rows: MonthlyReviewRow[]): string {
  return rows
    .filter((r) => r.status === MONTHLY_DRAFT_STATUS || isReviewRecord(r))
    .map((r) => `${r.id}:${r.status}`)
    .sort()
    .join('|');
}

function sessionAlreadyApproved(rows: MonthlyReviewRow[], sessionId: string): boolean {
  return rows.some(
    (r) =>
      r.status === MONTHLY_REVIEW_APPROVED_STATUS &&
      r.goalId === `${REVIEW_GOAL_PREFIX}${sessionId}`
  );
}

const ALREADY_APPROVED =
  'The review for this session is already approved and published. It can be drafted again once the next session is booked.';
const NO_SESSION =
  'Book the member’s next session first. A monthly review is drafted for a booked session.';
const STATE_CHANGED =
  'This review was approved, saved or discarded while the new draft was being written. Reload and try again.';
const DRAFT_MOVED_ON =
  'This draft changed since you opened it (another tab or coach saved, approved or redrafted it). Reload to see the latest version.';
const SESSION_MOVED_ON =
  'This draft was made for a session that is no longer the member’s next session. Draft the review again for the new session.';

function parseRecord(description: string | null): ReviewRecord | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description) as ReviewRecord;
    return parsed && parsed.version === 1 && typeof parsed.guidance === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function dateOnly(d: Date | null): string {
  return (d ?? new Date()).toISOString().slice(0, 10);
}

function toDraftAction(row: MonthlyReviewRow): DraftAction {
  const priority = row.priority === 'high' || row.priority === 'low' ? row.priority : 'medium';
  return {
    title: row.title,
    description: row.description,
    goalId: row.goalId,
    priority,
    dueDate: dateOnly(row.dueDate),
  };
}

function actionRows(actions: DraftAction[], status: string): NewMonthlyReviewRow[] {
  return actions.map((a, i) => ({
    title: a.title,
    description: a.description,
    status,
    goalId: a.goalId,
    priority: a.priority,
    dueDate: new Date(`${a.dueDate}T00:00:00.000Z`),
    // 'coach' marks a coach-set action. Inside the planned customer|coach CHECK (GP-646).
    assignedTo: 'coach',
    // After the member's existing actions.
    sortOrder: 1000 + i,
  }));
}

function recordRow(record: ReviewRecord, status: string): NewMonthlyReviewRow {
  return {
    title: `Monthly review${record.sessionAt ? ` for the ${record.sessionAt.slice(0, 10)} session` : ''}`,
    description: JSON.stringify(record),
    status,
    goalId: `${REVIEW_GOAL_PREFIX}${record.sessionId ?? 'none'}`,
    priority: null,
    dueDate: null,
    assignedTo: 'coach',
    sortOrder: 0,
  };
}

async function currentDraft(store: MonthlyReviewStore, userId: string) {
  const rows = await store.listRows(userId);
  const drafts = rows.filter((r) => r.status === MONTHLY_DRAFT_STATUS);
  const recordRowFound = drafts.find(isReviewRecord) ?? null;
  const record = recordRowFound ? parseRecord(recordRowFound.description) : null;
  const actions = drafts
    .filter((r) => !isReviewRecord(r))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toDraftAction);
  return { record, actions, revision: record ? recordRowFound!.id : null };
}

/**
 * Every coach write runs this under the member lock: the draft must still be the exact version the
 * coach was looking at, and still belong to the member's next booked session. Anything else is a
 * conflict and nothing is written.
 */
function draftConflict(
  draft: { record: ReviewRecord | null; revision: string | null },
  revision: unknown,
  member: MonthlyReviewMember
): string | null {
  if (typeof revision !== 'string' || revision !== draft.revision) return DRAFT_MOVED_ON;
  if (draft.record?.sessionId !== member.nextSession?.id) return SESSION_MOVED_ON;
  return null;
}

/** Coach view: the draft review (if any) plus what the editor needs. */
export async function getMonthlyReviewView(
  userId: string,
  store: MonthlyReviewStore = prismaMonthlyReviewStore,
  now: Date = new Date()
): Promise<MonthlyReviewView> {
  const [member, draft] = await Promise.all([
    store.loadMember(userId, now),
    currentDraft(store, userId),
  ]);
  const base = {
    nextSession: member.nextSession
      ? { id: member.nextSession.id, scheduledAt: member.nextSession.scheduledAt.toISOString() }
      : null,
    goals: parsePlanGoals(member.goalsJson),
    currentGuidance: member.latestGuidance,
  };
  if (!draft.record) {
    return {
      ...base,
      status: 'none',
      generatedAt: null,
      source: null,
      review: null,
      guidance: '',
      actions: [],
      revision: null,
      stale: false,
    };
  }
  return {
    ...base,
    status: 'draft',
    revision: draft.revision,
    stale: draft.record.sessionId !== (member.nextSession?.id ?? null),
    generatedAt: draft.record.generatedAt,
    source: draft.record.source,
    review: draft.record.review,
    guidance: draft.record.guidance,
    actions: draft.actions,
  };
}

/**
 * Generate (or regenerate) the month-in-review, draft actions and draft guidance for the member's
 * next session. Replaces any earlier unapproved draft. The member sees nothing.
 */
export async function generateMonthlyReview(
  userId: string,
  deps: {
    store?: MonthlyReviewStore;
    now?: Date;
    draftWithModel?: ModelDraftFn;
  } = {}
): Promise<MonthlyReviewView> {
  const store = deps.store ?? prismaMonthlyReviewStore;
  const now = deps.now ?? new Date();
  const draftWithModel = deps.draftWithModel ?? draftMonthlyReviewWithOpenRouter;

  // Import first: the review must see the member's legacy actions, and a draft row written before
  // the import would stop the portal from ever importing them.
  await store.importLegacyActions(userId);
  const [member, rows] = await Promise.all([store.loadMember(userId, now), store.listRows(userId)]);
  // A review belongs to one booked session (GP-629: "before each scheduled session"). Without one
  // there is no key to stop a second approved batch, so nothing is drafted (review r2 P1).
  if (!member.nextSession) throw new MonthlyReviewConflictError(NO_SESSION);
  const sessionId = member.nextSession.id;
  if (sessionAlreadyApproved(rows, sessionId))
    throw new MonthlyReviewConflictError(ALREADY_APPROVED);
  const snapshot = coachStateFingerprint(rows);
  const input = {
    memberName: member.memberName,
    businessName: member.businessName,
    focusTitle: member.focusTitle,
    latestGuidance: member.latestGuidance,
    goals: parsePlanGoals(member.goalsJson),
    actions: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      progressNote: r.progressNote,
      goalId: r.goalId,
    })),
    prepNotes: member.prepNotes,
    sessionPrep: parseSessionPrep(member.nextSession?.prepResponsesJson),
    nextSessionAt: member.nextSession?.scheduledAt ?? null,
    now,
  };

  // The model call runs outside the member lock so a slow reply never holds the lock.
  const reply = await draftWithModel(buildMonthlyReviewMessages(input, buildMonthInReview(input)));
  const draft = composeMonthlyReviewDraft(input, reply?.text ?? null);
  const record: ReviewRecord = {
    version: 1,
    sessionId,
    sessionAt: member.nextSession.scheduledAt.toISOString(),
    generatedAt: now.toISOString(),
    source: draft.source,
    model: draft.source === 'model' ? (reply?.model ?? null) : null,
    review: draft.review,
    guidance: draft.guidance,
  };

  await store.withMemberLock(userId, async (locked) => {
    const current = await locked.listRows(userId);
    if (sessionAlreadyApproved(current, sessionId)) {
      throw new MonthlyReviewConflictError(ALREADY_APPROVED);
    }
    if (coachStateFingerprint(current) !== snapshot) {
      throw new MonthlyReviewConflictError(STATE_CHANGED);
    }
    await locked.deleteDraftRows(userId);
    await locked.createRows(userId, [
      recordRow(record, MONTHLY_DRAFT_STATUS),
      ...actionRows(draft.actions, MONTHLY_DRAFT_STATUS),
    ]);
  });

  return getMonthlyReviewView(userId, store, now);
}

export type MonthlyReviewWriteResult =
  | { status: 'saved' }
  | { status: 'approved'; published: number }
  | { status: 'discarded' }
  | { status: 'nothing_to_approve' }
  | { status: 'conflict'; detail: string }
  | { status: 'invalid'; detail: string };

/** Save coach edits to the draft. Still hidden from the member. */
export async function saveMonthlyReview(
  userId: string,
  rawEdits: unknown,
  revision: unknown,
  store: MonthlyReviewStore = prismaMonthlyReviewStore,
  now: Date = new Date()
): Promise<MonthlyReviewWriteResult> {
  return store.withMemberLock(userId, async (locked) => {
    const member = await locked.loadMember(userId, now);
    const draft = await currentDraft(locked, userId);
    const { record } = draft;
    if (!record) return { status: 'nothing_to_approve' };
    const conflict = draftConflict(draft, revision, member);
    if (conflict) return { status: 'conflict', detail: conflict };
    const valid = validateCoachEdits(rawEdits, parsePlanGoals(member.goalsJson));
    if (!valid.ok) return { status: 'invalid', detail: valid.detail };
    await locked.deleteDraftRows(userId);
    await locked.createRows(userId, [
      recordRow({ ...record, guidance: valid.edits.guidance }, MONTHLY_DRAFT_STATUS),
      ...actionRows(valid.edits.actions, MONTHLY_DRAFT_STATUS),
    ]);
    return { status: 'saved' };
  });
}

/**
 * Approve all: publish the draft actions to the member's board as `todo` and set the plan's latest
 * guidance. With `rawEdits`, the edited set is what gets published. Running it twice publishes once.
 * `revision` must be the draft version the coach approved from (see draftConflict).
 */
export async function approveMonthlyReview(
  userId: string,
  rawEdits: unknown,
  revision: unknown,
  store: MonthlyReviewStore = prismaMonthlyReviewStore,
  now: Date = new Date()
): Promise<MonthlyReviewWriteResult> {
  return store.withMemberLock(userId, async (locked) => {
    const member = await locked.loadMember(userId, now);
    const draft = await currentDraft(locked, userId);
    const { record, actions } = draft;
    if (!record) return { status: 'nothing_to_approve' };
    const conflict = draftConflict(draft, revision, member);
    if (conflict) return { status: 'conflict', detail: conflict };
    let final = { guidance: record.guidance, actions };
    if (rawEdits !== undefined) {
      const valid = validateCoachEdits(rawEdits, parsePlanGoals(member.goalsJson));
      if (!valid.ok) return { status: 'invalid', detail: valid.detail };
      final = valid.edits;
    }
    if (!final.guidance.trim()) return { status: 'invalid', detail: 'Guidance cannot be empty.' };

    await locked.deleteDraftRows(userId);
    await locked.createRows(userId, [
      recordRow({ ...record, guidance: final.guidance }, MONTHLY_REVIEW_APPROVED_STATUS),
      ...actionRows(final.actions, 'todo'),
    ]);
    await locked.setLatestGuidance(userId, final.guidance);
    return { status: 'approved', published: final.actions.length };
  });
}

/**
 * Throw the draft away. The member never saw it. Only the version the coach was looking at is
 * discarded; a stale-session draft can still be discarded so the coach can clear it.
 */
export async function discardMonthlyReview(
  userId: string,
  revision: unknown,
  store: MonthlyReviewStore = prismaMonthlyReviewStore
): Promise<MonthlyReviewWriteResult> {
  return store.withMemberLock(userId, async (locked) => {
    const draft = await currentDraft(locked, userId);
    if (draft.record && (typeof revision !== 'string' || revision !== draft.revision)) {
      return { status: 'conflict', detail: DRAFT_MOVED_ON };
    }
    await locked.deleteDraftRows(userId);
    return { status: 'discarded' };
  });
}

// ---------------------------------------------------------------------------------------------
// Prisma store
// ---------------------------------------------------------------------------------------------

type MonthlyReviewDb = Pick<
  typeof prisma,
  | 'carsiCoachingAction'
  | 'carsiCoachingGrowthPlan'
  | 'carsiCoachingSession'
  | 'carsiCoachingBusinessProfile'
  | 'lmsUser'
  | 'carsiCoachingMonthlySubscription'
>;

function prismaStoreFor(db: MonthlyReviewDb): MonthlyReviewStore {
  const store: MonthlyReviewStore = {
    // Same lock as the GP-633 learning path: a row lock on the member's lms_users row.
    async withMemberLock(userId, fn) {
      return prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM lms_users WHERE id = ${userId}::uuid FOR UPDATE`;
        return fn(prismaStoreFor(tx));
      });
    },
    async loadMember(userId, now) {
      const [user, profile, plan, nextSession, prepNotes] = await Promise.all([
        db.lmsUser.findUnique({ where: { id: userId }, select: { fullName: true, email: true } }),
        db.carsiCoachingBusinessProfile.findUnique({
          where: { userId },
          select: { businessName: true },
        }),
        db.carsiCoachingGrowthPlan.findUnique({
          where: { userId },
          select: { focusTitle: true, latestGuidance: true, goalsJson: true },
        }),
        db.carsiCoachingSession.findFirst({
          where: { userId, status: 'scheduled', scheduledAt: { gte: now } },
          orderBy: { scheduledAt: 'asc' },
          select: { id: true, scheduledAt: true, prepResponsesJson: true },
        }),
        readCoachingSessionPrepNotes(userId),
      ]);
      const memberName = user?.fullName?.trim() || user?.email || 'Member';
      return {
        memberName,
        businessName: profile?.businessName?.trim() || memberName,
        focusTitle: plan?.focusTitle ?? null,
        latestGuidance: plan?.latestGuidance ?? null,
        goalsJson: plan?.goalsJson ?? null,
        prepNotes,
        nextSession,
      };
    },
    async listRows(userId) {
      return db.carsiCoachingAction.findMany({
        where: { userId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          goalId: true,
          priority: true,
          dueDate: true,
          progressNote: true,
          assignedTo: true,
          sortOrder: true,
        },
      });
    },
    async deleteDraftRows(userId) {
      await db.carsiCoachingAction.deleteMany({ where: { userId, status: MONTHLY_DRAFT_STATUS } });
    },
    async createRows(userId, rows) {
      if (rows.length === 0) return;
      await db.carsiCoachingAction.createMany({ data: rows.map((r) => ({ userId, ...r })) });
    },
    async setLatestGuidance(userId, guidance) {
      await db.carsiCoachingGrowthPlan.upsert({
        where: { userId },
        // A member without a plan row gets one in 'draft' so only the guidance shows.
        create: { userId, latestGuidance: guidance },
        update: { latestGuidance: guidance },
      });
    },
    async importLegacyActions(userId) {
      const sub = await db.carsiCoachingMonthlySubscription.findUnique({
        where: { userId },
        select: { monthlyActionsJson: true },
      });
      if (sub?.monthlyActionsJson) {
        await importLegacyActionsFromSubscriptionJson(userId, sub.monthlyActionsJson);
      }
    },
  };
  return store;
}

export const prismaMonthlyReviewStore: MonthlyReviewStore = prismaStoreFor(prisma);
