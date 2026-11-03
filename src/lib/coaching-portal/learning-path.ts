/**
 * GP-633 (Coaching advantage A6) — prescribed learning path.
 *
 * Pure rules only: read a member's business assessment, find the gap areas, and turn them
 * into a ranked list of CARSI courses. The server layer (`carsi-coaching-learning-path.ts`)
 * stores each course as a `learning` action on the coaching action board, linked through the
 * action's `goalId` as `course:<courseId>` so no schema change is needed.
 *
 * Deterministic on purpose: no model call, so the same answers always give the same path and
 * the coach can see exactly why each course was picked.
 */
import type { AssessmentResponses } from '@/lib/coaching-portal/assessment-schema';
import {
  DEFAULT_COACHING_CHAPTER_SLUG,
  type CoachingChapterSlug,
} from '@/lib/coaching-portal/coach-routing';
import type { CoachingActionStatus } from '@/lib/coaching-portal/types';

export type LearningGapArea = 'marketing' | 'sales' | 'money' | 'operations' | 'technology';

export const LEARNING_GAP_AREAS: LearningGapArea[] = [
  'marketing',
  'sales',
  'money',
  'operations',
  'technology',
];

export const LEARNING_GAP_LABELS: Record<LearningGapArea, string> = {
  marketing: 'Marketing and online visibility',
  sales: 'Enquiries and sales',
  money: 'Pricing and profit',
  operations: 'Operations and admin',
  technology: 'Technology and automation',
};

export type LearningGap = {
  area: LearningGapArea;
  score: number;
  /** Plain-English reasons the coach can read back to the member. */
  reasons: string[];
};

/** A gap needs at least this much evidence before it prescribes anything. */
export const LEARNING_GAP_THRESHOLD = 2;

/** Default cap so a path stays short enough to finish between monthly sessions. */
export const DEFAULT_LEARNING_PATH_LIMIT = 4;

/**
 * Gap area → recommended course slugs, per coaching chapter, in priority order. Slugs that are
 * not live in the published catalogue are skipped at assignment time (fail closed).
 * Coach-editable storage for this map is a follow-up; today a coach adjusts each member's path.
 */
export const DEFAULT_GAP_COURSE_MAP: Record<
  CoachingChapterSlug,
  Record<LearningGapArea, string[]>
> = {
  [DEFAULT_COACHING_CHAPTER_SLUG]: {
    marketing: ['social-media-marketing', 'introduction-to-water-damage-marketing-and-sales'],
    sales: [
      'introduction-to-water-damage-marketing-and-sales',
      'introduction-to-water-damage-estimating',
    ],
    money: ['admin-sole-trader', 'introduction-to-water-damage-estimating'],
    operations: ['introduction-to-project-management-for-water-losses', 'admin-sole-trader'],
    technology: ['agi-essentials-small-business'],
  },
};

const MARKETING_TOPIC =
  // "leads" only: a singular "lead" is usually a person ("train a crew lead").
  /\b(marketing|leads|enquir(y|ies)|visib\w*|found|google|seo|website|social|facebook|instagram|reviews?|advertis\w*|ads)\b/i;
const SALES_TOPIC =
  /\b(sales?|sell|quot(e|es|ing)|convert|conversion|close|closing|follow[- ]?up|pric(e|es|ing))\b/i;
const MONEY_TOPIC =
  /\b(cash ?flow|profit|margin|pric(e|es|ing)|debt|overdue|invoic(e|es|ing)|money)\b/i;
const OPS_TOPIC =
  /\b(rework|bottleneck|stress|schedul|staff|hiring|admin|paperwork|system|process|chaos|overwhelm)\w*/i;
const TECH_TOPIC = /\b(ai|automat\w*|software|app|crm|digital|tech\w*)\b/i;
const NO_MARKETING = /\b(none|nothing|not much|no marketing|nil|n\/a)\b/i;
const WORD_OF_MOUTH = /\b(word of mouth|referrals?)\b/i;
const MANUAL_TOOLS = /\b(paper|spreadsheet|excel|whiteboard|notebook|diary)\b/i;
const PRESSURED_PROFIT = new Set(['Under pressure', 'Breaking even']);

function text(r: AssessmentResponses, key: string): string {
  return (r[key] ?? '').trim();
}

/** Member's own words about what matters this year — the strongest gap signal we have. */
function priorityText(r: AssessmentResponses): string {
  return [text(r, 'top_priorities'), text(r, 'success_12m')].join(' ');
}

export function detectAssessmentGaps(r: AssessmentResponses): LearningGap[] {
  const priorities = priorityText(r);
  const found: LearningGap[] = [];

  const add = (points: number, reason: string, acc: LearningGap) => {
    acc.score += points;
    acc.reasons.push(reason);
  };

  // Marketing
  {
    const g: LearningGap = { area: 'marketing', score: 0, reasons: [] };
    const efforts = text(r, 'marketing_efforts');
    const leads = text(r, 'lead_sources');
    const answeredSection = Boolean(efforts || leads);
    if (efforts && NO_MARKETING.test(efforts)) add(2, 'Little or no marketing running today', g);
    if (leads && WORD_OF_MOUTH.test(leads)) add(1, 'Enquiries rely on word of mouth', g);
    if (answeredSection && !text(r, 'website_url')) add(1, 'No website listed', g);
    if (answeredSection && !text(r, 'google_business_url'))
      add(1, 'No Google Business Profile listed', g);
    if (MARKETING_TOPIC.test(priorities)) add(2, 'Named marketing or leads as a priority', g);
    found.push(g);
  }

  // Sales
  {
    const g: LearningGap = { area: 'sales', score: 0, reasons: [] };
    const lose = text(r, 'conversion_challenges');
    if (lose && SALES_TOPIC.test(lose)) add(1, 'Losing people at the quote or follow-up stage', g);
    if (SALES_TOPIC.test(priorities)) add(2, 'Named quoting, pricing or sales as a priority', g);
    found.push(g);
  }

  // Money
  {
    const g: LearningGap = { area: 'money', score: 0, reasons: [] };
    if (PRESSURED_PROFIT.has(text(r, 'profitability'))) add(2, 'Profitability is tight', g);
    if (MONEY_TOPIC.test(priorities)) add(2, 'Named cash flow, pricing or profit as a priority', g);
    if (MONEY_TOPIC.test(text(r, 'revenue_notes')))
      add(1, 'Raised money concerns in the revenue notes', g);
    found.push(g);
  }

  // Operations
  {
    const g: LearningGap = { area: 'operations', score: 0, reasons: [] };
    if (OPS_TOPIC.test(text(r, 'ops_pain')))
      add(2, 'Rework, scheduling or admin is causing stress', g);
    if (OPS_TOPIC.test(priorities)) add(1, 'Named systems, staff or admin as a priority', g);
    found.push(g);
  }

  // Technology
  {
    const g: LearningGap = { area: 'technology', score: 0, reasons: [] };
    if (MANUAL_TOOLS.test(text(r, 'tools_used')))
      add(1, 'Still running on paper or spreadsheets', g);
    if (text(r, 'automation_interest')) add(1, 'Wants to automate part of the business', g);
    if (TECH_TOPIC.test(priorities)) add(1, 'Named AI, automation or software as a priority', g);
    found.push(g);
  }

  return found
    .filter((g) => g.score >= LEARNING_GAP_THRESHOLD)
    .sort(
      (a, b) =>
        b.score - a.score || LEARNING_GAP_AREAS.indexOf(a.area) - LEARNING_GAP_AREAS.indexOf(b.area)
    );
}

export type LearningCatalogueCourse = { id: string; slug: string; title: string };

export type RecommendedLearningModule = {
  courseId: string;
  slug: string;
  title: string;
  area: LearningGapArea;
  rank: number;
};

export function recommendLearningModules(input: {
  gaps: LearningGap[];
  courseMap: Record<CoachingChapterSlug, Record<LearningGapArea, string[]>>;
  catalogue: LearningCatalogueCourse[];
  completedCourseIds: Set<string>;
  chapterSlug?: CoachingChapterSlug;
  limit?: number;
}): RecommendedLearningModule[] {
  const chapterMap =
    input.courseMap[input.chapterSlug ?? DEFAULT_COACHING_CHAPTER_SLUG] ??
    input.courseMap[DEFAULT_COACHING_CHAPTER_SLUG];
  if (!chapterMap) return [];
  const bySlug = new Map(input.catalogue.map((c) => [c.slug, c]));
  const limit = input.limit ?? DEFAULT_LEARNING_PATH_LIMIT;
  const seen = new Set<string>();
  const out: RecommendedLearningModule[] = [];

  for (const gap of input.gaps) {
    for (const slug of chapterMap[gap.area] ?? []) {
      if (out.length >= limit) return out;
      const course = bySlug.get(slug);
      if (!course || seen.has(course.id) || input.completedCourseIds.has(course.id)) continue;
      seen.add(course.id);
      out.push({
        courseId: course.id,
        slug,
        title: course.title,
        area: gap.area,
        rank: out.length + 1,
      });
    }
  }
  return out;
}

/** Every course slug any chapter map can prescribe — the set the server looks up. */
export function mappedCourseSlugs(
  courseMap: Record<CoachingChapterSlug, Record<LearningGapArea, string[]>> = DEFAULT_GAP_COURSE_MAP
): string[] {
  const all = new Set<string>();
  for (const chapter of Object.values(courseMap)) {
    for (const slugs of Object.values(chapter)) for (const s of slugs) all.add(s);
  }
  return [...all];
}

export const LEARNING_GOAL_PREFIX = 'course:';
/**
 * Status of a learning action the coach removed. The row is kept (hidden from the board) so the
 * coach's decision outlives the row: assignment never re-prescribes a path that was cleared.
 */
export const LEARNING_REMOVED_STATUS = 'removed';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `goalId` value linking a board action to an LMS course (fits the 64-char column). */
export function learningGoalId(courseId: string): string {
  return `${LEARNING_GOAL_PREFIX}${courseId}`;
}

export function parseLearningGoalId(goalId: string | null | undefined): string | null {
  if (!goalId?.startsWith(LEARNING_GOAL_PREFIX)) return null;
  const id = goalId.slice(LEARNING_GOAL_PREFIX.length);
  return UUID_RE.test(id) ? id : null;
}

export type LearningCourseProgress = {
  enrolled: boolean;
  /** The LMS has marked the enrolment complete (the only source of "done"). */
  completed: boolean;
  lessonsTotal: number;
  lessonsCompleted: number;
};

export function rollupLearningProgress(p: LearningCourseProgress): {
  percent: number;
  status: CoachingActionStatus;
} {
  if (p.completed) return { percent: 100, status: 'done' };
  const raw = p.lessonsTotal > 0 ? (p.lessonsCompleted / p.lessonsTotal) * 100 : 0;
  // Lessons alone never claim 100%: the LMS completion (quizzes, assessments) decides that.
  const percent = Math.min(99, Math.round(raw));
  const started = p.enrolled || p.lessonsCompleted > 0;
  return { percent, status: started ? 'in_progress' : 'todo' };
}

/**
 * Where a learning action should send the member. The lesson player refuses anyone without an
 * enrolment, and most prescribed courses are paid, so an unenrolled member goes to the course
 * page, where they can enrol.
 */
export function learningCourseLink(input: {
  courseSlug: string;
  enrolled: boolean;
}): { href: string; label: string } | null {
  if (!input.courseSlug) return null;
  const slug = encodeURIComponent(input.courseSlug);
  return input.enrolled
    ? { href: `/dashboard/learn/${slug}`, label: 'Continue the course' }
    : { href: `/courses/${slug}`, label: 'View the course' };
}

export type CoachPathAdjustment = {
  add?: string[];
  remove?: string[];
  order?: string[];
};

/** Apply a coach's edit to an ordered list of course ids. Pure; validation happens upstream. */
export function applyCoachPathAdjustment(current: string[], adj: CoachPathAdjustment): string[] {
  const removed = new Set(adj.remove ?? []);
  const path = current.filter((id) => !removed.has(id));
  for (const id of adj.add ?? []) if (!path.includes(id) && !removed.has(id)) path.push(id);
  if (!adj.order?.length) return path;
  const ordered = adj.order.filter((id, i) => path.includes(id) && adj.order!.indexOf(id) === i);
  return [...ordered, ...path.filter((id) => !ordered.includes(id))];
}
