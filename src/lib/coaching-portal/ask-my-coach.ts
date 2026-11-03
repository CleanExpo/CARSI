/**
 * GP-630 (Coaching advantage A3) — "Ask my coach".
 *
 * Pure rules only. A member's question is matched against their coach's knowledge base.
 * If the coach's own material covers it, the answer IS that material, quoted word for word
 * with its source. Nothing is generated, so nothing can be invented. If the material does
 * not cover it, or the question touches a compliance topic, the question goes to the coach.
 *
 * Deterministic on purpose (same pattern as the GP-633 learning path): no model call, so the
 * same question always gets the same answer and the coach can see exactly why.
 */

export type CoachKnowledgeItem = {
  id: string;
  title: string;
  /** The coach's own words, quoted verbatim in an answer. */
  body: string;
  sourceLabel: string;
  sourceHref: string;
};

export type CoachKnowledgeBase = {
  coachId: string;
  items: CoachKnowledgeItem[];
};

export type AskCitation = {
  itemId: string;
  title: string;
  sourceLabel: string;
  sourceHref: string;
};

export type AskPassage = { itemId: string; title: string; text: string };

export type KnowledgeBaseAnswer =
  | { status: 'answered'; passages: AskPassage[]; citations: AskCitation[] }
  | { status: 'needs_coach'; reason: 'no_grounded_source' | 'compliance_topic' };

/** Escalated questions live on the coaching action board, tagged per coach. */
export const ASK_COACH_GOAL_PREFIX = 'ask-coach:';

export function askCoachGoalId(coachId: string): string {
  return `${ASK_COACH_GOAL_PREFIX}${coachId}`;
}

export function isAskCoachGoalId(goalId: string | null | undefined): boolean {
  return typeof goalId === 'string' && goalId.startsWith(ASK_COACH_GOAL_PREFIX);
}

export const ASK_COACH_QUESTION_MIN = 5;
export const ASK_COACH_QUESTION_MAX = 1000;
export const ASK_COACH_ANSWER_MAX = 4000;

/** Trimmed question, or null when it is empty, too short or too long. */
export function normaliseQuestion(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const q = raw.replace(/\s+/g, ' ').trim();
  if (q.length < ASK_COACH_QUESTION_MIN || q.length > ASK_COACH_QUESTION_MAX) return null;
  return q;
}

/**
 * Certification (including "cert"), accreditation, licensing, qualification, credential,
 * designation and continuing-education questions are never
 * answered by the assistant. They carry licence risk for CARSI, so a person answers them.
 */
const COMPLIANCE_TOPIC_RE =
  /\b(iicrc|cecs?|continuing\s+education|certs?|certif\w*|accredit\w*|licen[cs]\w*|qualif\w*|credential\w*|designation\w*)\b/i;

export function isComplianceSensitiveQuestion(text: string): boolean {
  return COMPLIANCE_TOPIC_RE.test(text);
}

/** Member-facing assistant copy, kept in one place so the compliance test scans all of it. */
export const ASK_COACH_COPY = {
  eyebrow: 'Ask my coach',
  title: 'Ask a question between sessions',
  intro:
    'Answers come only from your coach’s own material, with the source shown. If the material does not cover your question, it goes straight to your coach.',
  placeholder: 'For example: how do I stop undercharging when I quote a job?',
  submit: 'Ask',
  answeredLead: 'From your coach’s material',
  sentToCoach:
    'Your coach’s material does not cover this yet, so we have sent it to your coach. Their answer will appear below and on your action board.',
  complianceSentToCoach:
    'Your coach answers this kind of question personally, so we have sent it to them. Their answer will appear below.',
  noCoach: 'You do not have a coach assigned yet, so we could not send this question.',
  historyTitle: 'Your questions to your coach',
  waiting: 'Waiting for your coach',
  coachAnswered: 'Your coach answered',
  error: 'Something went wrong. Please try again.',
} as const;

const STOPWORDS = new Set(
  (
    'a about after again all am an and any are as at be been before being but by can could ' +
    'did do does doing for from get got had has have how i if in into is it its just me more ' +
    'most my need next no not now of off on once only or other our out over own please same ' +
    'should so some still such than that the their them then there these they this those to ' +
    'too up us very want was we were what when where which while who whom why will with would ' +
    'you your yours best good way ways much many tips'
  ).split(' ')
);

function stem(word: string): string {
  for (const suffix of ['ing', 'ed', 'es', 's', 'e']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

/** Content words, lower-cased and lightly stemmed so "quoting" matches "quote". */
export function contentTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOPWORDS.has(raw)) continue;
    out.add(stem(raw));
  }
  return out;
}

/** Share of the question's content words an item must contain to count as covering it. */
export const ASK_COACH_MIN_COVERAGE = 0.5;
/** And never on a single shared word. */
export const ASK_COACH_MIN_MATCHED = 2;
const MAX_PASSAGES = 2;

export function answerFromKnowledgeBase(
  question: string,
  kb: CoachKnowledgeBase
): KnowledgeBaseAnswer {
  if (isComplianceSensitiveQuestion(question)) {
    return { status: 'needs_coach', reason: 'compliance_topic' };
  }
  const q = contentTokens(question);
  if (q.size < ASK_COACH_MIN_MATCHED)
    return { status: 'needs_coach', reason: 'no_grounded_source' };

  const scored = kb.items
    .filter((item) => !isComplianceSensitiveQuestion(`${item.title} ${item.body}`))
    .map((item) => {
      const itemTokens = contentTokens(`${item.title} ${item.body}`);
      let matched = 0;
      for (const t of q) if (itemTokens.has(t)) matched += 1;
      return { item, matched, coverage: matched / q.size };
    })
    .filter((s) => s.matched >= ASK_COACH_MIN_MATCHED && s.coverage >= ASK_COACH_MIN_COVERAGE)
    .sort((a, b) => b.coverage - a.coverage || b.matched - a.matched)
    .slice(0, MAX_PASSAGES);

  if (scored.length === 0) return { status: 'needs_coach', reason: 'no_grounded_source' };

  return {
    status: 'answered',
    passages: scored.map(({ item }) => ({ itemId: item.id, title: item.title, text: item.body })),
    citations: scored.map(({ item }) => ({
      itemId: item.id,
      title: item.title,
      sourceLabel: item.sourceLabel,
      sourceHref: item.sourceHref,
    })),
  };
}
