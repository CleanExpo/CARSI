/**
 * GP-629 (Coaching advantage A2): the AI monthly review.
 *
 * Before each session the member's own action board, plan goals and prep notes become a
 * month-in-review, 3–7 draft actions for next month and draft "latest guidance". The coach edits
 * and approves; nothing reaches the member before that.
 *
 * Draft mechanism (no migration): drafts are ordinary `carsi_coaching_actions` rows with
 * `status = 'draft'` and `assigned_to = 'coach'`. The member store reads an allowlist of the four
 * board statuses, so a draft never reaches the member. `assigned_to` stays inside
 * 'customer' | 'coach', so the planned CHECK constraint (GP-646) holds. The review text and draft
 * guidance sit in one extra row per review, marked by `goal_id = 'review:<sessionId>'`, with the
 * JSON in `description`.
 *
 * This file is pure: no database, no network. The month-in-review facts are computed here and never
 * by the model, so the coach sees the same facts with or without AI.
 */

export const MEMBER_BOARD_STATUSES = ['todo', 'in_progress', 'done', 'blocked'] as const;
export type MemberBoardStatus = (typeof MEMBER_BOARD_STATUSES)[number];

/** Coach-only draft (an action or the review record). Never on the member board. */
export const MONTHLY_DRAFT_STATUS = 'draft';
/** An approved review record, kept for the coach's history. Never on the member board. */
export const MONTHLY_REVIEW_APPROVED_STATUS = 'review_approved';
/** goal_id prefix of the review record row (goal_id is VARCHAR(64); a UUID fits). */
export const REVIEW_GOAL_PREFIX = 'review:';

export const MIN_DRAFT_ACTIONS = 3;
export const MAX_DRAFT_ACTIONS = 7;
/** Coach edits may go outside the 3–7 the generator aims for, within reason. */
export const MAX_COACH_ACTIONS = 12;
export const MAX_GUIDANCE_LENGTH = 4000;
export const MAX_TITLE_LENGTH = 500;
export const MAX_DESCRIPTION_LENGTH = 4000;

export const DRAFT_PRIORITIES = ['high', 'medium', 'low'] as const;
export type DraftPriority = (typeof DRAFT_PRIORITIES)[number];

/** Default and maximum days from the upcoming session to an action's due date. */
const DEFAULT_DUE_DAYS = 28;
const MAX_DUE_DAYS = 28;

/** Outcome guarantees and credential claims never go into coaching copy. */
const BANNED_COPY = /\b(guarantee[ds]?|guaranteeing|IICRC|CEC)\b/i;

export type PlanGoal = { id: string; title: string };

export type ReviewActionInput = {
  id: string;
  title: string;
  status: string;
  progressNote: string | null;
  goalId: string | null;
};

export type SessionPrepAnswers = { progress?: string; challenges?: string; discuss?: string };

export type MonthlyReviewInput = {
  memberName: string;
  businessName: string;
  focusTitle: string | null;
  latestGuidance: string | null;
  goals: PlanGoal[];
  actions: ReviewActionInput[];
  prepNotes: string;
  sessionPrep: SessionPrepAnswers | null;
  nextSessionAt: Date | null;
  now: Date;
};

export type MonthInReview = {
  summary: string;
  counts: { total: number; done: number; blocked: number; open: number };
  completed: { title: string; note: string | null }[];
  blocked: { title: string; reason: string }[];
  open: { title: string; status: MemberBoardStatus }[];
  memberFlagged: string[];
};

export type DraftAction = {
  title: string;
  description: string | null;
  goalId: string | null;
  priority: DraftPriority;
  /** YYYY-MM-DD */
  dueDate: string;
};

export type MonthlyReviewDraft = {
  review: MonthInReview;
  actions: DraftAction[];
  guidance: string;
  source: 'model' | 'fallback';
};

export type ChatMessage = { role: 'system' | 'user'; content: string };

function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function isBoardStatus(s: string): s is MemberBoardStatus {
  return (MEMBER_BOARD_STATUSES as readonly string[]).includes(s);
}

/** Parse plan goals_json ([{ id, title }]) leniently; anything malformed is skipped. */
export function parsePlanGoals(goalsJson: string | null | undefined): PlanGoal[] {
  if (!goalsJson) return [];
  try {
    const parsed = JSON.parse(goalsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((g) => {
      if (!g || typeof g !== 'object') return [];
      const { id, title } = g as Record<string, unknown>;
      if (typeof id !== 'string' || !id.trim() || typeof title !== 'string') return [];
      return [{ id: id.trim(), title: clean(title) }];
    });
  } catch {
    return [];
  }
}

/** Parse session prep_responses_json ({ progress, challenges, discuss }) leniently. */
export function parseSessionPrep(json: string | null | undefined): SessionPrepAnswers | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const pick = (k: string) => (typeof parsed[k] === 'string' ? (parsed[k] as string) : undefined);
    return { progress: pick('progress'), challenges: pick('challenges'), discuss: pick('discuss') };
  } catch {
    return null;
  }
}

/** The facts of the month, straight from the member's board and prep. No model involved. */
export function buildMonthInReview(input: MonthlyReviewInput): MonthInReview {
  const board = input.actions.filter((a) => isBoardStatus(a.status));
  const completed = board
    .filter((a) => a.status === 'done')
    .map((a) => ({ title: clean(a.title), note: clean(a.progressNote) || null }));
  const blocked = board
    .filter((a) => a.status === 'blocked')
    .map((a) => ({
      title: clean(a.title),
      reason: clean(a.progressNote) || 'No reason recorded on the board.',
    }));
  const open = board
    .filter((a) => a.status === 'todo' || a.status === 'in_progress')
    .map((a) => ({ title: clean(a.title), status: a.status as MemberBoardStatus }));

  const memberFlagged: string[] = [];
  const prep = input.sessionPrep;
  if (clean(prep?.progress)) memberFlagged.push(`Progress: ${clean(prep?.progress)}`);
  if (clean(prep?.challenges)) memberFlagged.push(`Challenge: ${clean(prep?.challenges)}`);
  if (clean(prep?.discuss)) memberFlagged.push(`To discuss: ${clean(prep?.discuss)}`);
  if (clean(input.prepNotes)) memberFlagged.push(`Prep note: ${clean(input.prepNotes)}`);

  const counts = {
    total: board.length,
    done: completed.length,
    blocked: blocked.length,
    open: open.length,
  };
  const summary =
    counts.total === 0
      ? 'No actions on the board this month.'
      : `${counts.done} of ${counts.total} actions done, ${counts.blocked} blocked, ${counts.open} still open.`;

  return { summary, counts, completed, blocked, open, memberFlagged };
}

function boardLines(input: MonthlyReviewInput): string[] {
  return input.actions
    .filter((a) => isBoardStatus(a.status))
    .map((a) => {
      const note = clean(a.progressNote);
      const goal = a.goalId ? ` [goal ${a.goalId}]` : '';
      return `- (${a.status}) ${clean(a.title)}${goal}${note ? ` | member note: ${note}` : ''}`;
    });
}

/** Chat messages for the model. Grounded only in the member's own board, plan and prep. */
export function buildMonthlyReviewMessages(
  input: MonthlyReviewInput,
  review: MonthInReview
): ChatMessage[] {
  const system = [
    'You help a small-business coach prepare a member’s monthly coaching review.',
    'Use only the facts given below: the member’s action board, plan goals and session prep. Do not invent numbers, events, people or results.',
    'Write in plain Australian English, short sentences, speaking to the member as "you". No emojis, no hype.',
    'Never promise or guarantee outcomes, income or results, and never mention training credentials or industry bodies.',
    `Propose ${MIN_DRAFT_ACTIONS} to ${MAX_DRAFT_ACTIONS} concrete actions for next month. Prefer unblocking blocked work and acting on what the member flagged.`,
    'Do not repeat an action that is already open on the board.',
    'Each action links to one plan goal id from the list, or null when none fits.',
    'Reply with JSON only, no prose around it, in this shape:',
    '{"summary": string (2-3 sentences on the month), "guidance": string (3-5 sentences of guidance for next month),',
    '"actions": [{"title": string, "description": string | null, "goalId": string | null, "priority": "high" | "medium" | "low", "dueInDays": number (1-28)}]}',
  ].join(' ');

  const goals = input.goals.length
    ? input.goals.map((g) => `- ${g.id}: ${g.title}`).join('\n')
    : '- (no goals set)';
  const parts = [
    `Business: ${clean(input.businessName) || 'not given'}`,
    `Plan focus: ${clean(input.focusTitle) || 'not set'}`,
    `Current guidance on the plan: ${clean(input.latestGuidance) || 'none yet'}`,
    `Plan goals:\n${goals}`,
    `Action board this month (${review.summary}):\n${boardLines(input).join('\n') || '- (empty)'}`,
    `What the member flagged before the session:\n${
      review.memberFlagged.map((f) => `- ${f}`).join('\n') || '- (nothing)'
    }`,
  ];
  return [
    { role: 'system', content: system },
    { role: 'user', content: parts.join('\n\n') },
  ];
}

function addDaysIso(base: Date, days: number): string {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dueBase(input: MonthlyReviewInput): Date {
  return input.nextSessionAt && input.nextSessionAt > input.now ? input.nextSessionAt : input.now;
}

function clampDueDays(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_DUE_DAYS;
  return Math.min(MAX_DUE_DAYS, Math.max(1, Math.round(raw)));
}

function titleKey(title: string): string {
  return clean(title).toLowerCase();
}

/** Extract the first JSON object from a model reply (tolerates code fences). */
function extractJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Board-grounded drafts used when the model is unavailable, and to top up a short model list.
 * `generic` items are only used to reach the minimum when the board and prep give too little.
 */
function fallbackActions(input: MonthlyReviewInput): {
  grounded: DraftAction[];
  generic: DraftAction[];
} {
  const base = dueBase(input);
  const goalIds = new Set(input.goals.map((g) => g.id));
  const out: DraftAction[] = [];
  const push = (
    title: string,
    goalId: string | null,
    priority: DraftPriority,
    description: string | null
  ) =>
    out.push({ title, goalId, priority, description, dueDate: addDaysIso(base, DEFAULT_DUE_DAYS) });

  for (const a of input.actions.filter((x) => x.status === 'blocked')) {
    const goalId = a.goalId && goalIds.has(a.goalId) ? a.goalId : null;
    const why = clean(a.progressNote);
    push(
      `Unblock: ${clean(a.title)}`,
      goalId,
      'high',
      why ? `It stalled because: ${why}` : 'It stalled last month with no reason recorded.'
    );
  }
  const prep = input.sessionPrep;
  if (clean(prep?.challenges)) {
    push(`Act on what you flagged: ${clean(prep?.challenges)}`, null, 'medium', null);
  }
  if (clean(prep?.discuss)) {
    push(`Follow up from the session: ${clean(prep?.discuss)}`, null, 'medium', null);
  }
  const goalsInPlay = new Set(
    input.actions
      .filter((a) => a.status === 'todo' || a.status === 'in_progress' || a.status === 'blocked')
      .map((a) => a.goalId)
  );
  for (const g of input.goals) {
    if (!goalsInPlay.has(g.id)) push(`Next step on goal: ${g.title}`, g.id, 'medium', null);
  }
  const grounded = out.map((a) => ({ ...a, title: a.title.slice(0, MAX_TITLE_LENGTH) }));
  const generic = [
    ...(clean(input.focusTitle)
      ? [`Review progress on your focus: ${clean(input.focusTitle)}`.slice(0, MAX_TITLE_LENGTH)]
      : []),
    'Update every action on your board before the next session',
    'Note one win and one roadblock from this month for your coach',
    'Pick the one action that would make next month easier and do it first',
  ].map((title): DraftAction => ({
    title,
    goalId: null,
    priority: 'low',
    description: null,
    dueDate: addDaysIso(base, DEFAULT_DUE_DAYS),
  }));
  return { grounded, generic };
}

function fallbackGuidance(input: MonthlyReviewInput, review: MonthInReview): string {
  const { counts } = review;
  const lines: string[] = [];
  lines.push(
    counts.total === 0
      ? 'Your board was empty this month, so start next month by writing down the few things that matter most.'
      : `You finished ${counts.done} of ${counts.total} actions this month.`
  );
  if (review.blocked.length) {
    lines.push(
      `Unblocking ${review.blocked.map((b) => `"${b.title}"`).join(' and ')} comes first next month.`
    );
  }
  if (review.open.length) {
    lines.push(`Keep going on the ${review.open.length} open action(s) already on your board.`);
  }
  if (clean(input.focusTitle)) lines.push(`Your focus stays: ${clean(input.focusTitle)}.`);
  return lines.join(' ');
}

function validModelAction(
  raw: unknown,
  input: MonthlyReviewInput,
  goalIds: Set<string>
): DraftAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? clean(r.title).slice(0, MAX_TITLE_LENGTH) : '';
  if (!title) return null;
  const description =
    typeof r.description === 'string' && clean(r.description)
      ? clean(r.description).slice(0, MAX_DESCRIPTION_LENGTH)
      : null;
  if (BANNED_COPY.test(title) || (description && BANNED_COPY.test(description))) return null;
  const goalId = typeof r.goalId === 'string' && goalIds.has(r.goalId) ? r.goalId : null;
  const priority = (DRAFT_PRIORITIES as readonly string[]).includes(r.priority as string)
    ? (r.priority as DraftPriority)
    : 'medium';
  return {
    title,
    description,
    goalId,
    priority,
    dueDate: addDaysIso(dueBase(input), clampDueDays(r.dueInDays)),
  };
}

/**
 * Turn a model reply (or null) into a validated draft. The model only proposes; every field is
 * checked here, and anything missing or unsafe falls back to the board-grounded draft.
 */
export function composeMonthlyReviewDraft(
  input: MonthlyReviewInput,
  modelReply: string | null
): MonthlyReviewDraft {
  const review = buildMonthInReview(input);
  const goalIds = new Set(input.goals.map((g) => g.id));
  const openTitles = new Set(
    input.actions
      .filter((a) => isBoardStatus(a.status) && a.status !== 'done')
      .map((a) => titleKey(a.title))
  );

  const parsed = modelReply ? extractJsonObject(modelReply) : null;
  const modelActionsRaw = parsed && Array.isArray(parsed.actions) ? parsed.actions : null;

  const seen = new Set<string>();
  const take = (list: DraftAction[], into: DraftAction[], limit: number) => {
    for (const a of list) {
      if (into.length >= limit) break;
      const key = titleKey(a.title);
      if (seen.has(key) || openTitles.has(key)) continue;
      seen.add(key);
      into.push(a);
    }
  };

  const actions: DraftAction[] = [];
  if (modelActionsRaw) {
    const valid = modelActionsRaw
      .map((a) => validModelAction(a, input, goalIds))
      .filter((a): a is DraftAction => a !== null);
    take(valid, actions, MAX_DRAFT_ACTIONS);
  }
  const source: MonthlyReviewDraft['source'] = actions.length > 0 ? 'model' : 'fallback';
  const fill = fallbackActions(input);
  // Without the model every grounded item counts (up to 7); a short model list is only topped up.
  take(fill.grounded, actions, source === 'model' ? MIN_DRAFT_ACTIONS : MAX_DRAFT_ACTIONS);
  take(fill.generic, actions, MIN_DRAFT_ACTIONS);

  const modelGuidance =
    source === 'model' && typeof parsed?.guidance === 'string' ? clean(parsed.guidance) : '';
  const guidance =
    modelGuidance && !BANNED_COPY.test(modelGuidance)
      ? modelGuidance.slice(0, MAX_GUIDANCE_LENGTH)
      : fallbackGuidance(input, review);

  const modelSummary =
    source === 'model' && typeof parsed?.summary === 'string' ? clean(parsed.summary) : '';
  const summary =
    modelSummary && !BANNED_COPY.test(modelSummary)
      ? modelSummary.slice(0, MAX_DESCRIPTION_LENGTH)
      : review.summary;

  return { review: { ...review, summary }, actions, guidance, source };
}

/** Coach edits: validated before anything is written. */
export type CoachDraftEdits = {
  guidance: string;
  actions: {
    title: string;
    description: string | null;
    goalId: string | null;
    priority: string;
    dueDate: string | null;
  }[];
};

export type ValidCoachEdits = { guidance: string; actions: DraftAction[] };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function validIsoDate(s: string): boolean {
  const m = ISO_DATE.exec(s);
  if (!m) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function validateCoachEdits(
  raw: unknown,
  goals: PlanGoal[]
): { ok: true; edits: ValidCoachEdits } | { ok: false; detail: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, detail: 'Edits are missing.' };
  const r = raw as Record<string, unknown>;
  const guidance = typeof r.guidance === 'string' ? r.guidance.trim() : '';
  if (!guidance) return { ok: false, detail: 'Guidance cannot be empty.' };
  if (guidance.length > MAX_GUIDANCE_LENGTH) return { ok: false, detail: 'Guidance is too long.' };
  if (!Array.isArray(r.actions)) return { ok: false, detail: 'Actions are missing.' };
  if (r.actions.length > MAX_COACH_ACTIONS) {
    return { ok: false, detail: `At most ${MAX_COACH_ACTIONS} actions.` };
  }
  const goalIds = new Set(goals.map((g) => g.id));
  const actions: DraftAction[] = [];
  for (const [i, a] of r.actions.entries()) {
    const n = i + 1;
    if (!a || typeof a !== 'object') return { ok: false, detail: `Action ${n} is invalid.` };
    const x = a as Record<string, unknown>;
    const title = typeof x.title === 'string' ? x.title.trim() : '';
    if (!title || title.length > MAX_TITLE_LENGTH) {
      return {
        ok: false,
        detail: `Action ${n} needs a title (up to ${MAX_TITLE_LENGTH} characters).`,
      };
    }
    const description =
      typeof x.description === 'string' && x.description.trim() ? x.description.trim() : null;
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return { ok: false, detail: `Action ${n} description is too long.` };
    }
    const goalId = x.goalId === null || x.goalId === undefined || x.goalId === '' ? null : x.goalId;
    if (goalId !== null && (typeof goalId !== 'string' || !goalIds.has(goalId))) {
      return { ok: false, detail: `Action ${n} links to a goal that is not on the plan.` };
    }
    if (!(DRAFT_PRIORITIES as readonly unknown[]).includes(x.priority)) {
      return { ok: false, detail: `Action ${n} priority must be high, medium or low.` };
    }
    if (typeof x.dueDate !== 'string' || !validIsoDate(x.dueDate)) {
      return { ok: false, detail: `Action ${n} needs a valid due date.` };
    }
    actions.push({
      title,
      description,
      goalId: goalId as string | null,
      priority: x.priority as DraftPriority,
      dueDate: x.dueDate,
    });
  }
  return { ok: true, edits: { guidance, actions } };
}
