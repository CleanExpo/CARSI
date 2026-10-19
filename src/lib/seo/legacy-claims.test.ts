import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Claim-discipline guard for the four recovered legacy courses (review r3, 19/10/2026).
 * Ported from the rebuilt title-only course guard. It is FAIL-CLOSED: every clause of
 * learner-facing copy must classify as one of the allowed kinds, or the guard fails.
 *  - CITED: the clause itself carries a link with a dated check. A citation clears only its own
 *    clause; sentences are split at ";", ": " and spaced dashes, so a cited first clause cannot
 *    launder an uncited second one.
 *  - INSTRUCTION: the clause starts with an imperative verb (or "If/When/Before …, <verb>"), and
 *    gives no reason ("because", "since", ", which", "so that") and no statistic.
 *  - COURSE: the clause describes this course itself, with no reason and no statistic.
 *  - QUESTION: the clause ends with "?" and carries no statistic.
 *  - EXERCISE: the clause sits under a "Try it", "Recall", "Mixed practice" or "CARSI example"
 *    heading (practice data and answers); banned, IICRC and standards rules still apply.
 *  - Labels ("<strong>Lead ads:</strong>", headings, titles, tags) get the banned rules.
 * Also enforced: banned health-outcome, income and IICRC-branding literals; no IICRC/CEC wording
 * in copy or meta (meta.cecHours aside); standards named by number only, never described; quotes
 * short, linked, dated and openly licensed; quiz questions name their basis; quiz options share
 * a word count and similar length. Lessons, titles, descriptions, tags, meta and the quiz seed
 * files are all scanned.
 */
interface Lesson {
  title: string;
  contentType: string;
  contentBody?: string | null;
}
interface Course {
  slug: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  tags?: string[];
  cecHours?: number | null;
  iicrcDiscipline?: string | null;
  meta?: Record<string, unknown> | null;
  modules: { title?: string; lessons: Lesson[] }[];
}
interface QuizFile {
  courseSlug?: string;
  quizzes?: {
    quizId?: string;
    title?: string;
    questions?: {
      questionText?: string;
      options?: string[];
      correctIndex?: number;
      explanation?: string;
    }[];
  }[];
}

const SLUGS = [
  'asthma-and-allergy-course',
  'agi-essentials-small-business',
  'social-media-marketing',
  'admin-sole-trader',
];

const ROOT = join(__dirname, '..', '..', '..');
const catalogue = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8')) as {
    courses: Course[];
  }
).courses;
const courses = catalogue.filter((entry) => SLUGS.includes(entry.slug));

// no try/catch: a missing quiz seed must fail the guard, not scan nothing
const quizFile = (slug: string): QuizFile =>
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', `${slug}-quiz.json`), 'utf8')) as QuizFile;

function quizStrings(q: QuizFile): string[] {
  const out: string[] = [];
  for (const quiz of q.quizzes ?? []) {
    out.push(quiz.title ?? '');
    for (const question of quiz.questions ?? []) {
      out.push(
        question.questionText ?? '',
        ...(question.options ?? []),
        question.explanation ?? ''
      );
    }
  }
  return out.filter(Boolean);
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  deg: '°',
  times: '×',
  hellip: '…',
};
const decode = (s: string) => s.replace(/&([a-z0-9]+);/gi, (m, e: string) => ENTITIES[e] ?? m);

// A direct quote and its attribution line, kept together so the pair is checked as one unit.
const QUOTE_UNIT = /<blockquote>([\s\S]*?)<\/blockquote>(<p><em>Quote:<\/em>[\s\S]*?<\/p>)?/g;

function quoteUnits(html: string): { quote: string; attribution: string }[] {
  return [...html.matchAll(QUOTE_UNIT)].map((m) => ({ quote: m[1], attribution: m[2] ?? '' }));
}

function sentences(text: string): string[] {
  return (
    decode(text.replace(/<a\s+href="https?:\/\/[^"]+"[^>]*>/g, ' [link] ').replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      // "p. 4" / "pp. 3" is a page reference, not a sentence end
      .split(/(?<=[.!?])(?<!\bpp?\.)\s+(?=[A-Z0-9"“'(&$])/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/** Split a sentence into clauses at ";", ": " and spaced dashes, outside parentheses. */
function clauses(sentence: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < sentence.length; i++) {
    const ch = sentence[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    const cut =
      depth === 0 &&
      (ch === ';' ||
        (ch === ':' && sentence[i + 1] === ' ') ||
        (/[—–]/.test(ch) && sentence[i - 1] === ' '));
    if (cut) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim().replace(/^[.,\s]+|[.,\s]+$/g, '')).filter(Boolean);
}

const BANNED = new RegExp(
  [
    'allergy[- ]free',
    'guaranteed (relief|results?|income)',
    'relieve\\w* (your|their|of) (asthma|allerg)',
    'cure[ds]? (your |their )?(asthma|allerg)',
    'earn \\$[\\d,]+ (a|per) (week|month|year)',
    'make \\$[\\d,]+ (a|per) (week|month|year)',
    'hospital[- ]grade',
    'kills? \\d+(\\.\\d+)?\\s?%',
    'mou?ld[- ]free',
    'germ[- ]free',
    'sterili[sz]es?',
    '100\\s?% (dry|safe|effective)',
    'IICRC[- ](certified|accredited|approved) course',
    // joined so the repo's own terminology guards do not flag this rule as copy
    ['get', 'IICRC', 'certified'].join(' '),
    '\\b(WRT|ASD|AMRT|FSRT|CCT|TCST)\\b',
    '-aligned\\b',
  ].join('|'),
  'i'
);
// No standards-body or credit-hours framing in these courses, in copy or in meta.
const NO_IICRC = /IICRC|\bCECs?\b/;

// A standard may be named; a sentence that says what it says, requires or omits is banned.
const STANDARD_CLAIM =
  /\bS5\d0\b[^.]*\b(says|states|requires|recommends|specifies|mandates|omits|does not mention|never mentions)\b|\b(says|states|requires|recommends|specifies|mandates|omits)\b[^.]*\bS5\d0\b/i;
const STANDARDS_BODY_CLAIM =
  /\b(?:AS\/NZS|AS IEC|AS|NZS|ISO|IEC|ASTM)\s?[A-Z]?\d[\d.]*(?:[:-]\d{4})?\b[^.]*\b(requires?|specif(?:y|ies)|sets out|sets|covers|says|states|mandates|recommends|omits|prohibits|limits)\b/i;

const DATED = /checked \d{1,2}\/\d{1,2}\/\d{4}/i;
const CITED = /\[link\][^)]*checked \d{1,2}\/\d{1,2}\/\d{4}/i;
const STAT_CLAIM =
  /\b\d+(\.\d+)?\s?%|\b\d+ in \d+\b|\b\d+\s+out of\s+\d+\b|\b\d+(\.\d+)?\s?(?:times|x)\s+(?:more|higher|greater|larger|faster|as)\b|\b(?:twice|three times)\s+as\b|\b(?:double|triple|halve|half)\s+(?:the|your|their|as)\b/i;
const CITATION = /\[link\]|\([^)]*\b[a-z0-9-]+\.(gov|com|org)\.(au|nz)\b[^)]*\)/i;

const IMPERATIVE = new Set(
  (
    'add agitate allow answer apply ask assess attach avoid book boost bring build buy ' +
    'calculate call capture carry check choose claim clean close collect compare complete ' +
    'confirm contact copy create decide delete describe diarise do dry exclude explain ' +
    'extract file fill fit-check get give identify install invoice itemise judge keep label ' +
    'launch leave list map market master move name never note offer open pay photograph pick ' +
    'plan position post pre-spray pre-vacuum prefer print promise put quote read recheck ' +
    'recommend reconcile record reduce refer refresh register remove replace respond review ' +
    'run secure send set start state store tag tailor take tell test track treat turn upload ' +
    'use vacuum ventilate wash watch wear win write'
  ).split(' ')
);
const COURSE_SELF =
  /^(By the end of this (lesson|course),? you will|This (course|lesson|module)\b|Each (lesson|module)\b|In this course\b|A CARSI course\b|CARSI worked examples\b)/i;
// a reason or relative clause (", which …") turns an instruction into a claim
const REASON = /\b(because|since|so that|due to|as a result)\b|, which\b/i;
const firstWord = (s: string) => (s.match(/^[A-Za-z’'-]+/)?.[0] ?? '').toLowerCase();

function isInstruction(cl: string): boolean {
  const body = cl.replace(/^(then|also|only|always|first|next|finally)\s+/i, '');
  if (/^(do not|don’t|never)\b/i.test(body)) return true;
  if (IMPERATIVE.has(firstWord(body))) return true;
  const cond = body.match(
    /^(if|when|before|after|once|until|where|while|for|on|at|in)\b[^,]*,\s*(.*)$/i
  );
  return cond ? isInstruction(cond[2]) : false;
}

type Kind = 'cited' | 'instruction' | 'course' | 'question';
function clauseKind(cl: string): Kind | null {
  if (CITED.test(cl)) return 'cited';
  // a statistic or a reason is a claim, whatever form the clause takes
  if (STAT_CLAIM.test(cl) || REASON.test(cl)) return null;
  if (/\?$/.test(cl)) return 'question';
  if (COURSE_SELF.test(cl)) return 'course';
  if (isInstruction(cl)) return 'instruction';
  return null;
}

/** Rules every string gets, wherever it appears. */
function baseViolations(s: string): string[] {
  const bad: string[] = [];
  if (BANNED.test(s)) bad.push(`banned: ${s}`);
  if (NO_IICRC.test(s)) bad.push(`IICRC/CEC wording: ${s}`);
  if (STANDARD_CLAIM.test(s) || STANDARDS_BODY_CLAIM.test(s)) bad.push(`standard claim: ${s}`);
  if (CITATION.test(s) && !DATED.test(s)) bad.push(`undated citation: ${s}`);
  return bad;
}

/** Classify every clause of claim-bearing prose; anything unclassified is a violation. */
function proseViolations(textBlocks: string[]): string[] {
  const bad: string[] = [];
  for (const b of textBlocks) {
    for (const s of sentences(b)) {
      bad.push(...baseViolations(s));
      for (const cl of clauses(s)) {
        if (CITATION.test(cl) && !DATED.test(cl))
          bad.push(`citation not dated in its clause: ${cl}`);
        if (!clauseKind(cl)) bad.push(`unsourced clause: ${cl}`);
      }
    }
  }
  return bad;
}

// Sections under these headings are labelled practice; their content is data, not claims.
const EXERCISE = /^<h3>(?:CARSI example|Try it|Recall|Mixed practice)/;
const LABEL =
  /<strong>([^<]{1,60}?):?<\/strong>:?|<h[1-6]>([\s\S]*?)<\/h[1-6]>|<summary>([\s\S]*?)<\/summary>/g;

interface Split {
  prose: string[];
  exercises: string[];
  labels: string[];
}
function splitLesson(html: string): Split {
  const out: Split = { prose: [], exercises: [], labels: [] };
  for (const sec of html.replace(QUOTE_UNIT, '').split(/(?=<h3>)/)) {
    for (const m of sec.matchAll(LABEL)) out.labels.push(decode(m[1] ?? m[2] ?? m[3] ?? ''));
    const blocks = sec.replace(LABEL, ' ').split(/<\/(?:p|li|ul|ol|details)>/);
    (EXERCISE.test(sec) ? out.exercises : out.prose).push(...blocks);
  }
  return out;
}

function courseSplit(c: Course): Split {
  const out: Split = { prose: [], exercises: [], labels: [] };
  for (const m of c.modules) {
    out.labels.push(m.title ?? '');
    for (const l of m.lessons) {
      out.labels.push(l.title);
      if (l.contentType !== 'text') continue;
      const s = splitLesson(l.contentBody ?? '');
      out.prose.push(...s.prose);
      out.exercises.push(...s.exercises);
      out.labels.push(...s.labels);
    }
  }
  out.prose.push(c.description ?? '', c.shortDescription ?? '');
  out.labels.push(c.title, ...(c.tags ?? []));
  return out;
}

/** Meta is not learner prose, but it is surfaced to consumers: banned, IICRC and standards rules. */
function metaViolations(c: Course): string[] {
  const bad: string[] = [];
  for (const [k, v] of Object.entries(c.meta ?? {})) {
    if (k === 'cecHours') continue; // the explicit fail-closed CEC note
    for (const s of JSON.stringify(v).split(/(?<=[.;])\s+/))
      for (const x of baseViolations(s)) bad.push(`meta.${k}: ${x}`);
  }
  return bad;
}

// "Per ASCIA, …" / "Per the ATO, …" name the source the answer comes from
const QUIZ_BASIS = /^per \S|\bper (the|this)\b|\bin this course\b|\d/i;

function quizViolations(q: QuizFile): string[] {
  const bad: string[] = [];
  for (const s of quizStrings(q)) bad.push(...baseViolations(s));
  for (const question of q.quizzes?.[0]?.questions ?? []) {
    const t = question.questionText ?? '';
    if (!QUIZ_BASIS.test(t))
      bad.push(`quiz question names no basis (per the …, in this course, or data): ${t}`);
  }
  return bad;
}

const QUOTE_SOURCE_BANNED =
  /IICRC|Standards (Australia|New Zealand)|Restoration Industry Association|\bRIA\b|ASHRAE/i;
const QUOTE_LICENCE = /CC BY|public domain|no copyright/i;

function quoteViolations(html: string): string[] {
  const bad: string[] = [];
  const units = quoteUnits(html);
  if ((html.match(/<blockquote>/g) ?? []).length !== units.length) bad.push('unmatched blockquote');
  for (const { quote, attribution } of units) {
    const q = quote.replace(/<[^>]+>/g, '').trim();
    if (!/^&ldquo;[\s\S]+&rdquo;$/.test(q)) bad.push(`quote not in quotation marks: ${q}`);
    if (sentences(q.replace(/&[lr]dquo;/g, '')).length > 2)
      bad.push(`quote over two sentences: ${q}`);
    if (!/<a href="https?:\/\//.test(attribution)) bad.push(`quote without linked source: ${q}`);
    if (!DATED.test(attribution)) bad.push(`quote without dated check: ${q}`);
    if (!QUOTE_LICENCE.test(attribution)) bad.push(`quote without open licence: ${q}`);
    if (QUOTE_SOURCE_BANNED.test(attribution)) bad.push(`quote from a closed source: ${q}`);
  }
  return bad;
}

const wordCount = (o: string) => o.trim().split(/\s+/).length;

/** Every option for a question has the same word count, a length within 1.5x, no formatting cue. */
function optionShapeViolations(q: QuizFile): string[] {
  const bad: string[] = [];
  for (const quiz of q.quizzes ?? []) {
    for (const question of quiz.questions ?? []) {
      const opts = question.options ?? [];
      const lens = opts.map((o) => o.length);
      if (new Set(opts.map(wordCount)).size > 1)
        bad.push(`word counts differ: ${question.questionText}`);
      if (Math.max(...lens) > 1.5 * Math.min(...lens))
        bad.push(`lengths differ: ${question.questionText}`);
      if (opts.some((o) => /[*_<>]/.test(o))) bad.push(`formatting cue: ${question.questionText}`);
    }
  }
  return bad;
}

function allViolations(c: Course, q: QuizFile): string[] {
  const s = courseSplit(c);
  return [
    ...proseViolations(s.prose),
    ...s.exercises.flatMap((b) => sentences(b).flatMap(baseViolations)),
    ...s.labels.flatMap((b) => sentences(b).flatMap(baseViolations)),
    ...metaViolations(c),
    ...quizViolations(q),
  ];
}

describe('legacy course claim discipline (four recovered courses, fail-closed)', () => {
  it('all four courses exist, CARSI-only (cecHours 0, iicrcDiscipline null)', () => {
    expect(courses.map((c) => c.slug).sort()).toEqual([...SLUGS].sort());
    for (const c of courses) {
      expect(c.cecHours, c.slug).toBe(0);
      expect(c.iicrcDiscipline, c.slug).toBeNull();
    }
  });

  it('each course ends in a quiz lesson bound to its quiz seed, with a valid answer key', () => {
    for (const c of courses) {
      const last = c.modules.at(-1)?.lessons.at(-1);
      const q = quizFile(c.slug);
      expect(q.courseSlug, c.slug).toBe(c.slug);
      expect(last?.contentType, c.slug).toBe('quiz');
      expect(last?.contentBody, c.slug).toBe(q.quizzes?.[0]?.quizId);
      const questions = q.quizzes?.[0]?.questions ?? [];
      expect(questions.length, c.slug).toBeGreaterThanOrEqual(8);
      for (const question of questions) {
        const n = question.options?.length ?? 0;
        expect(n, question.questionText).toBeGreaterThanOrEqual(2);
        expect(question.correctIndex, question.questionText).toBeLessThan(n);
      }
    }
  });

  it('every course feeds prose, exercises, labels, meta and quiz strings to the scan', () => {
    for (const c of courses) {
      const s = courseSplit(c);
      expect(s.prose.length, c.slug).toBeGreaterThan(0);
      expect(s.exercises.length, c.slug).toBeGreaterThan(0);
      expect(s.labels.length, c.slug).toBeGreaterThan(0);
      expect(Object.keys(c.meta ?? {}).length, c.slug).toBeGreaterThan(0);
      expect(quizStrings(quizFile(c.slug)).length, c.slug).toBeGreaterThan(0);
    }
  });

  it('every clause of copy is cited in that clause, an instruction, about the course, or a question', () => {
    const bad: string[] = [];
    for (const c of courses)
      for (const v of allViolations(c, quizFile(c.slug))) bad.push(`${c.slug} :: ${v}`);
    expect(bad).toEqual([]);
  });

  it('any direct quote is short, quoted, linked, dated, openly licensed and from an open source', () => {
    const bad: string[] = [];
    for (const c of courses)
      for (const m of c.modules)
        for (const l of m.lessons)
          for (const v of quoteViolations(l.contentBody ?? '')) bad.push(`${c.slug} :: ${v}`);
    expect(bad).toEqual([]);
  });

  it('quiz options give nothing away', () => {
    const bad: string[] = [];
    for (const c of courses)
      for (const v of optionShapeViolations(quizFile(c.slug))) bad.push(`${c.slug} :: ${v}`);
    expect(bad).toEqual([]);
  });

  it('planted controls: the r3 reviewer findings and each claim class are caught', () => {
    const planted = [
      // r3 findings, verbatim shapes
      '<p>389 deaths were due to asthma in 2018 – 139 males, 250 females</p>',
      '<p>In 2017-2018, 38,792 Australians were hospitalised due to asthma</p>',
      '<p>Asthma in New Zealand is the third leading cause of death</p>',
      '<p>The technology is simple, non-toxic, and scientifically proven to be effective.</p>',
      '<li>HEPA filter, removes 99.97% of particulates down to 0.3 microns</li>',
      '<li>They also reported being five to ten times faster and more innovative than before.</li>',
      '<li>This led to an increased market share and sector-leading returns.</li>',
      '<p>The ATO requires you to keep business records for five years.</p>',
      '<p>If you trade under another name, you must register that business name with ASIC.</p>',
      // banned literals
      '<p>Enjoy an allergy-free home.</p>',
      '<p>Our service will relieve your asthma.</p>',
      '<p>Earn $2,000 a week from anti-allergen work.</p>',
      // a cited first clause must not launder an uncited second clause
      '<p>Asthma is common (<a href="https://x.gov.au/">x</a>, checked 19/10/2026); our spray ends it.</p>',
      '<p>See allergy.org.au, checked 19/10/2026. 40% of homes have mould.</p>',
      // an instruction carrying a reason or a statistic is a claim
      '<p>Wear a mask because mites cause asthma.</p>',
      '<p>Use the spray, which removes all allergens.</p>',
      '<p>Treat 90% of the bedroom.</p>',
      // course-self and question forms cannot smuggle a statistic or reason
      '<p>This course doubles bookings by 40%.</p>',
      '<p>Did you know 90% of homes have dust mites?</p>',
    ];
    for (const b of planted) expect(proseViolations([b]).length, b).toBeGreaterThan(0);
    const clean = [
      '<p>In 2022, around 2.8 million people (11%) lived with asthma (<a ' +
        'href="https://www.aihw.gov.au/x">AIHW</a>, checked 19/10/2026).</p>',
      '<p>Mites are common (<a href="https://x.gov.au/">ASCIA, p. 1</a>, checked 19/10/2026).</p>',
      '<p>If the client has not seen a doctor, recommend they see their GP.</p>',
      '<p>Do not promise a health result.</p>',
      '<p>By the end of this lesson you will be able to quote an invoice rule.</p>',
      '<p>Which ad type suits quote requests?</p>',
    ];
    expect(proseViolations(clean)).toEqual([]);
  });

  it('planted controls: exercises, labels, meta and quiz strings are scanned', () => {
    const real = courses[0];
    const body =
      '<h3>Try it</h3><p>Boards read 22%. Leaves it allergy-free.</p>' +
      '<h3>Other</h3><p><strong>Rule:</strong> Boards read 22%.</p>';
    const s = splitLesson(body);
    expect(proseViolations(s.prose).length).toBe(1);
    expect(s.exercises.flatMap((b) => sentences(b).flatMap(baseViolations)).length).toBe(1);
    expect(s.labels).toContain('Rule');
    expect(metaViolations({ ...real, meta: { note: 'Not IICRC CEC-approved.' } })).not.toEqual([]);
    expect(metaViolations({ ...real, meta: { note: 'Guaranteed relief.' } })).not.toEqual([]);
    expect(metaViolations({ ...real, meta: { cecHours: '0' } })).toEqual([]);
    const quiz = (questionText: string, options: string[]): QuizFile => ({
      quizzes: [{ questions: [{ questionText, options }] }],
    });
    expect(quizViolations(quiz('Per ASCIA, what is it?', ['An allergy-free home']))).not.toEqual(
      []
    );
    expect(quizViolations(quiz('What do mites eat?', ['Skin']))).not.toEqual([]);
    expect(quizViolations(quiz('Per the ATO, how long?', ['5 years']))).toEqual([]);
    const titled = { ...real, title: 'Guaranteed relief cleaning' };
    expect(allViolations(titled, quizFile(real.slug))).not.toEqual([]);
    const shape = (options: string[]): QuizFile => ({
      quizzes: [{ questions: [{ questionText: 'Q?', options }] }],
    });
    expect(optionShapeViolations(shape(['Yes', 'No, because of this']))).not.toEqual([]);
    expect(optionShapeViolations(shape(['5 years', '7 years']))).toEqual([]);
    expect(quoteViolations('<blockquote><p>&ldquo;Bare.&rdquo;</p></blockquote>')).not.toEqual([]);
  });
});
