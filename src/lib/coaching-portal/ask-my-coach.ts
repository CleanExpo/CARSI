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
  /** Which knowledge source built this base (see coach-knowledge-base.ts). */
  sourceId?: string;
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
 * Questions about certification, recertification, accreditation, licensing, qualifications,
 * credentials, designations, approvals, credits or continuing education are never answered by
 * the assistant. They carry licence risk for CARSI, so a person answers them.
 *
 * Three review rounds each found a new spelling past a word list ("cert", "recertification",
 * "C.E.C.", "cerification"), so the check now covers the whole class at once:
 *   1. stems anywhere in a word (cert, accred, licen, qualif, credent, designat, approv, credit);
 *   2. the acronyms IICRC, CEC and CPD with all punctuation and spacing removed ("C.E.C.", "c e c");
 *   3. any word within a small edit distance of a credential term, so misspellings still match.
 * A false positive only sends a question to the coach, which is the safe direction. "certain"
 * is the one carve-out, because it is everyday English with no credential meaning.
 */
const COMPLIANCE_STEM_RE =
  /cert(?!ain)|accred|licen[cs]|qualif|credent|designat|\bapprov|\bcredit|continuing[\s-]*ed|professional[\s-]*develop/i;

const COMPLIANCE_ACRONYMS = ['iicrc', 'cec', 'cpd'];

const COMPLIANCE_TERMS = [
  'certification',
  'certificate',
  'certified',
  'certify',
  'recertification',
  'accreditation',
  'accredited',
  'licence',
  'license',
  'licensed',
  'licenced',
  'qualification',
  'qualified',
  'credential',
  'designation',
  'approval',
  'approved',
  'credits',
  'continuing',
  'iicrc',
];

function normaliseForCompliance(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Optimal string alignment distance, capped: returns cap + 1 once the cap is exceeded. */
function editDistanceWithin(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i += 1) {
    rows.push(new Array<number>(b.length + 1).fill(0));
    rows[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > cap) return cap + 1;
  }
  return rows[a.length][b.length];
}

function isNearComplianceTerm(word: string): boolean {
  if (word.length < 5) return false;
  return COMPLIANCE_TERMS.some((term) => {
    const cap = term.length >= 10 ? 2 : 1;
    return editDistanceWithin(word, term, cap) <= cap;
  });
}

/**
 * Acronyms spelt with dots, dashes or spaces ("C.E.C.", "c e c", "I-I-C-R-C") arrive as runs
 * of one-letter words; joining each run back together lets them match. Ordinary words are not
 * joined, so "price check" does not read as "cec".
 */
function mentionsComplianceAcronym(words: string[]): boolean {
  const candidates = [...words];
  let run = '';
  for (const w of [...words, '']) {
    if (w.length === 1) {
      run += w;
      continue;
    }
    if (run) candidates.push(run);
    run = '';
  }
  return candidates.some((w) =>
    COMPLIANCE_ACRONYMS.some((a) => w === a || w === `${a}s` || w.startsWith(a))
  );
}

export function isComplianceSensitiveQuestion(text: string): boolean {
  const t = normaliseForCompliance(text);
  if (COMPLIANCE_STEM_RE.test(t)) return true;
  const words = t.split(/[^a-z]+/).filter(Boolean);
  if (mentionsComplianceAcronym(words)) return true;
  return words.some(isNearComplianceTerm);
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
  if (word.endsWith('ies') && word.length >= 5) return `${word.slice(0, -3)}y`;
  for (const suffix of ['ing', 'ed', 'es', 's', 'e']) {
    const min = suffix === 's' ? 3 : 4;
    if (word.endsWith(suffix) && word.length - suffix.length >= min) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

/**
 * Content words, lower-cased and lightly stemmed so "quoting" matches "quote". Every word that
 * is not a stopword counts, however short: "c e c" or "CPD" must be covered like any other word.
 */
export function contentTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of normaliseForCompliance(text).split(/[^a-z0-9]+/)) {
    if (!raw || STOPWORDS.has(raw)) continue;
    out.add(stem(raw));
  }
  return out;
}

/**
 * Everyday business words a question may contain without the cited item containing them. Kept
 * short on purpose. Nothing credential-related may ever be added (a test enforces it).
 */
export const ASK_COACH_EVERYDAY_WORDS: ReadonlySet<string> = new Set([
  'business',
  'set',
  'setup',
  'use',
  'using',
  'start',
  'starting',
  'improve',
  'improving',
  'help',
  'make',
  'making',
  'work',
  'working',
  'run',
  'running',
  'manage',
  'handle',
  'grow',
  'growing',
  'more',
  'better',
  'right',
  'first',
  'often',
  'time',
  'week',
  'month',
  'customer',
  'customers',
  'client',
  'clients',
]);

const EVERYDAY_STEMS = new Set([...ASK_COACH_EVERYDAY_WORDS].map(stem));

/** An item must match at least this many of the question's words from its own text. */
export const ASK_COACH_MIN_MATCHED = 2;
const MAX_PASSAGES = 2;

/**
 * Fail closed. The assistant answers only when ONE item covers EVERY content word of the
 * question, apart from the short everyday-business list above. Any word the item does not
 * contain (a credential term, a misspelling, an acronym nobody listed, a topic the coach never
 * wrote about) sends the question to the coach, so a new phrasing can only cause an escalation,
 * never an answer. The compliance check runs first as a second, independent layer.
 */
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
      let uncovered = 0;
      for (const t of q) {
        if (itemTokens.has(t)) matched += 1;
        else if (!EVERYDAY_STEMS.has(t)) uncovered += 1;
      }
      return { item, matched, uncovered };
    })
    .filter((s) => s.uncovered === 0 && s.matched >= ASK_COACH_MIN_MATCHED)
    .sort((a, b) => b.matched - a.matched)
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
