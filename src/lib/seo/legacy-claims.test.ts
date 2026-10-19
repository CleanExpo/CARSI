import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Claim-discipline guard (coordinator 19/10/2026) for the four recovered legacy
 * courses. Two classes:
 *  - BANNED literals: health-outcome promises and income promises that may
 *    never appear (no exemption).
 *  - CLAIM stats: percentage/multiplier assertions that must carry an
 *    attributed, dated source in the same block.
 */
interface Lesson {
  title: string;
  contentBody?: string | null;
}
interface Course {
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  modules: { lessons: Lesson[] }[];
}

const SLUGS = [
  'asthma-and-allergy-course',
  'agi-essentials-small-business',
  'social-media-marketing',
  'admin-sole-trader',
];

const ROOT = join(__dirname, '..', '..', '..');
const catalogue = (
  JSON.parse(
    readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8'),
  ) as { courses: Course[] }
).courses;
const courses = catalogue.filter((entry) => SLUGS.includes(entry.slug));

const BANNED = new RegExp(
  [
    'allergy[- ]free',
    'guaranteed relief',
    'relieve\\w* (your|their|of) (asthma|allerg)',
    'cure[ds]? (your |their )?asthma',
    'guaranteed income',
    'earn \\$[\\d,]+ (a|per) (week|month|year)',
    'make \\$[\\d,]+ (a|per) (week|month|year)',
  ].join('|'),
  'i',
);

// r1: percentages, "N in N" fractions, "N out of N", numeric multipliers and
// verbal multipliers all state a quantitative fact and need a dated source.
const STAT_CLAIM =
  /\b\d+(\.\d+)?\s?%|\b\d+ in \d+\b|\b\d+\s+out of\s+\d+\b|\b\d+(\.\d+)?\s?(?:times|x)\s+(?:more|higher|greater|larger|faster|as)\b|\b(?:twice|three times)\s+as\s+(?:likely|many|much)\b|\b(?:double|triple|halve|half)\s+(?:the|your|their|as)\b/i;
const SOURCED =
  /(allergy\.org\.au|nationalasthma\.org\.au|health\.gov\.au|aihw\.gov\.au|ato\.gov\.au|abr\.gov\.au|asic\.gov\.au|accc\.gov\.au|safeworkaustralia\.gov\.au|animalmedicinesaustralia\.org\.au|health\.govt\.nz|humanesociety\.org|source:\s*https?:\/\/|original (2020|case|course) (material|report))/i;
const DATED = /checked\s+\d{1,2}\/\d{1,2}\/\d{4}|2020 course material|original case material/i;

// r2: quiz seed files are content too — questions, options and explanations
// carry the same claim rules as lesson bodies.
interface QuizFile {
  quizzes?: {
    questions?: {
      questionText?: string;
      options?: string[];
      explanation?: string;
    }[];
  }[];
}

function quizStringsFromJson(q: QuizFile): string[] {
  const out: string[] = [];
  for (const quiz of q.quizzes ?? []) {
    for (const question of quiz.questions ?? []) {
      out.push(
        question.questionText ?? '',
        ...(question.options ?? []),
        question.explanation ?? '',
      );
    }
  }
  return out;
}

function quizStrings(slug: string): string[] {
  // no try/catch: a missing quiz seed must fail the guard, not scan nothing
  const q = JSON.parse(
    readFileSync(join(ROOT, 'data', 'seed', `${slug}-quiz.json`), 'utf8'),
  ) as QuizFile;
  return quizStringsFromJson(q);
}

function blocks(c: Course): string[] {
  const out: string[] = [];
  for (const m of c.modules) {
    for (const l of m.lessons) {
      out.push(...(l.contentBody ?? '').split(/<\/(?:p|li|h[1-6]|ul|ol)>/));
    }
  }
  out.push(c.description ?? '', c.shortDescription ?? '');
  out.push(...quizStrings(c.slug));
  return out;
}

// r2: evaluation is sentence-level. A whole-block $ skip let a claim ride on
// any price in the same block; a whole-block attribution lets a claim
// piggyback on an unrelated citation. Skip only sentences that are pure
// prices/fees: a $ amount with no percentage or multiplier claim.
function sentences(text: string): string[] {
  return text
    .replace(/&nbsp;/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“'(&•$])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isPurePrice(s: string): boolean {
  return /\$\d/.test(s) && !STAT_CLAIM.test(s);
}

// dilution ratios and process parameters are not outcome claims
const DILUTION = /\b(10:1|1:0\.\d+|parts water|mL|litre|sqm|micron|°C|&deg;C)/;

function unattributedStatSentences(textBlocks: string[]): string[] {
  const bad: string[] = [];
  for (const b of textBlocks) {
    for (const s of sentences(b)) {
      if (!STAT_CLAIM.test(s)) continue;
      if (isPurePrice(s)) continue;
      if (DILUTION.test(s)) continue;
      if (!(SOURCED.test(s) && DATED.test(s))) bad.push(s);
    }
  }
  return bad;
}

describe('legacy course claim discipline (four recovered courses)', () => {
  it('all four courses exist', () => {
    expect(courses).toHaveLength(4);
  });

  it('carry no health-outcome or income promises', () => {
    for (const c of courses) {
      for (const b of blocks(c)) {
        expect(BANNED.test(b), `${c.slug}: banned literal in "${b.slice(0, 120)}"`).toBe(false);
      }
    }
  });

  it('every course contributes quiz strings to the scan', () => {
    for (const c of courses) {
      expect(quizStrings(c.slug).filter(Boolean).length, c.slug).toBeGreaterThan(0);
    }
  });

  it('percentage/multiplier statistics are attributed and dated in the same sentence', () => {
    const bad: string[] = [];
    for (const c of courses) {
      for (const s of unattributedStatSentences(blocks(c))) {
        bad.push(`${c.slug} :: ${s.slice(0, 160)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('planted controls: banned literals are all caught', () => {
    const controls = [
      'Enjoy an allergy-free home.',
      'We deliver guaranteed relief.',
      'Our service will relieve your asthma.',
      'This treatment cured asthma in trial homes.',
      'A guaranteed income for operators.',
      'Earn $2,000 a week from anti-allergen work.',
      'Make $5,000 per month with this service.',
    ];
    for (const b of controls) expect(BANNED.test(b)).toBe(true);
  });

  it('planted controls: unattributed stats are caught, attributed stats pass', () => {
    const bad = [
      '<p>25% of all allergies are caused by dust mites.</p>',
      '<p>1 in 3 customers will buy the upsell.</p>',
      '<p>3 out of 4 homes have dust mites.</p>',
      '<p>Indoor air can be 2.3 times more polluted than outdoor air.</p>',
      '<p>This method is 3x faster.</p>',
      '<p>Sensitised children are twice as likely to develop asthma.</p>',
      '<p>Double the coverage of a standard treatment.</p>',
      // r2: a price in the sentence no longer exempts a claim
      'The $20 treatment reduces asthma attacks by 50%.',
      // r2: a price elsewhere in the block no longer shields a claim
      '<p>Course fee: $129. Our method removes 90% of allergens.</p>',
      // r2: a citation in a neighbouring sentence no longer covers a claim
      '<p>See allergy.org.au, checked 19/10/2026. 40% of homes have mould.</p>',
    ];
    for (const b of bad) expect(unattributedStatSentences([b]), b).toHaveLength(1);
    const good = [
      '<p>Around 1 in 4 Australians are affected by allergic rhinitis (ASCIA, ' +
        'allergy.org.au, checked 19/10/2026).</p>',
      'Course fee: $129.',
    ];
    expect(unattributedStatSentences(good)).toEqual([]);
  });

  it('planted control: quiz seed options are scanned for banned literals', () => {
    const quiz: QuizFile = {
      quizzes: [
        {
          questions: [
            {
              questionText: 'What should you promise the client?',
              options: ['A clear scope of work', 'Enjoy an allergy-free home.'],
              explanation: 'Describe the work, not an outcome.',
            },
          ],
        },
      ],
    };
    const strings = quizStringsFromJson(quiz);
    expect(strings.some((s) => BANNED.test(s))).toBe(true);
  });
});
