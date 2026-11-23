/**
 * GP-721 — the IE-001 to IE-004 case-assessment quizzes in the Indoor Environment Assessment
 * Practitioner v1 draft. These fixtures prove that specific UNSAFE answers are marked wrong:
 * a workplace exposure limit used as a home or customer clearance level, a universal numeric
 * mould threshold, "mould present" on a flood with no mould observed, CO inferred from (or
 * excluded by) a VOC reading or an odour, restoring power after a flood, diagnosing a pet,
 * disturbing suspect asbestos, and wrongly dated benzene and Queensland transition limits.
 *
 * Each check has a planted-failure control below: the same check run on a copy of the quiz
 * with the unsafe option made correct must report a violation, so a green here cannot come
 * from a check that is unable to fail.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const DRAFT = join(process.cwd(), 'data/courses/assessing-indoor-environment-conditions/v1-draft');

type Question = {
  questionText: string;
  options: string[];
  correctIndex: number;
  points: number;
  explanation: string;
};
type Quiz = { quizId: string; title: string; passPercentage: number; questions: Question[] };

const quizFile = JSON.parse(
  readFileSync(join(DRAFT, 'assessing-indoor-environment-conditions-quiz.json'), 'utf8')
) as { quizzes: Quiz[] };
const catalogue = JSON.parse(readFileSync(join(DRAFT, 'courses-catalog.json'), 'utf8')) as {
  courses: { modules: { lessons: { contentType: string; contentBody: string }[] }[] }[];
};
const ledgerRows = readFileSync(join(DRAFT, 'evidence/evidence-ledger.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as { id: string; status: string; also_in?: string[] });

const CASE_QUIZ = {
  'IE-001': '1467ead9-5d75-4ae1-a2ee-850dddd3c92b',
  'IE-002': '2c6669f8-83f8-47d3-adaf-a233d1fc7c66',
  'IE-003': 'eebd60b3-40f1-4d9d-b602-e143def5d2d7',
  'IE-004': '5f1eb696-205c-404c-b5d3-6ab60f11ec31',
} as const;
type CaseId = keyof typeof CASE_QUIZ;

/** One question: a stem that finds it, the safe answer, and unsafe answers that must be wrong. */
type Fixture = { case: CaseId; why: string; stem: string; safe: string; unsafe: string[] };

const FIXTURES: Fixture[] = [
  {
    case: 'IE-001',
    why: 'no universal numeric mould or humidity threshold; no workplace limit for a bedroom',
    stem: 'humidity or spore number above which the bedroom becomes unsafe',
    safe: 'There is no universal safe number',
    unsafe: [
      'Spore counts above 500 mean unsafe',
      'Use a workplace limit as threshold',
      'Seventy per cent RH is unsafe',
    ],
  },
  {
    case: 'IE-001',
    why: 'an observation is not an identification of toxic mould',
    stem: 'How do you record it in the observation column',
    safe: 'Dark spotting at corner, visual only',
    unsafe: ['Toxic mould confirmed by sight alone', 'Health hazard confirmed for the infant'],
  },
  {
    case: 'IE-001',
    why: 'symptoms are recorded and referred, never diagnosed',
    stem: 'cough for two weeks',
    safe: 'Recorded as reported; refer to doctor',
    unsafe: ['The mould is causing the cough'],
  },
  {
    case: 'IE-002',
    why: 'flood-without-mould negative case: no mould may be recorded or sampled for on day 2',
    stem: 'No mould is visible and there is no musty smell',
    safe: 'Not observed today; later risk noted',
    unsafe: ['Present, because every flood means mould', 'Present; take spore samples to confirm'],
  },
  {
    case: 'IE-002',
    why: 'floodwater is presumed contaminated, not sampled to set PPE',
    stem: 'sample the floodwater',
    safe: 'No, presume it is contaminated',
    unsafe: ['Yes, results decide the PPE', 'Yes, before anyone wears gloves'],
  },
  {
    case: 'IE-002',
    why: 'no power until a licensed electrician has checked the flooded installation',
    stem: 'switch the power back on',
    safe: 'Not until a licensed electrician checks',
    unsafe: ['Yes, if the safety switch holds', 'Only the circuits above water level'],
  },
  {
    case: 'IE-002',
    why: 'animal health goes to a vet; the assessor never diagnoses or treats',
    stem: 'dog drank floodwater',
    safe: 'Record it; owner contacts vet now',
    unsafe: [
      "Diagnose leptospirosis from the dog's symptoms",
      'Advise antibiotics from the first-aid kit',
    ],
  },
  {
    case: 'IE-002',
    why: 'suspect asbestos is not disturbed, sampled or water-blasted',
    stem: 'fibre-cement eave lining',
    safe: 'Treat as suspect; do not disturb',
    unsafe: ['Snap off a sample to test', 'Water-blast it clean, then inspect it'],
  },
  {
    case: 'IE-003',
    why: 'VOC-without-CO negative case: a VOC reading or odour is not a CO finding',
    stem: 'TVOC indicator reads 2.1',
    safe: 'VOC indicator raised; CO not detected',
    unsafe: ['Carbon monoxide confirmed by chemical odour', 'VOC reading proves the heater leaks'],
  },
  {
    case: 'IE-003',
    why: 'no smell does not exclude CO, and a VOC meter does not detect CO',
    stem: "There's no smell when the heater runs",
    safe: 'CO has no smell; refer gasfitter',
    unsafe: ['Correct, no smell means no CO', 'A VOC meter will detect CO'],
  },
  {
    case: 'IE-003',
    why: 'the assessor never runs a CO-spillage test by creating the exposure',
    stem: 'test for spillage yourself',
    safe: 'No; a licensed gasfitter tests it',
    unsafe: ['Yes, for thirty minutes, windows shut'],
  },
  {
    case: 'IE-003',
    why: 'a WEL is not a home safe level',
    stem: "under 'the safe limit' in the workplace list",
    safe: 'Workplace limits are not home thresholds',
    unsafe: ['Yes, below the WEL means safe', 'Yes, compare with the benzene limit'],
  },
  {
    case: 'IE-003',
    why: 'benzene in May 2027 is still 1 ppm (3.2 mg/m³) 8-hour TWA',
    stem: 'In May 2027',
    safe: '1 ppm (3.2 mg/m³) 8-hour TWA',
    unsafe: ['0.2 ppm (0.7 mg/m³) 8-hour TWA', 'The home TVOC reading applies instead'],
  },
  {
    case: 'IE-003',
    why: 'benzene from 1 June 2027 is 0.2 ppm (0.7 mg/m³) 8-hour TWA',
    stem: '15 June 2027',
    safe: '0.2 ppm (0.7 mg/m³) 8-hour TWA',
    unsafe: ['1 ppm (3.2 mg/m³) 8-hour TWA', 'The residential reading sets the limit'],
  },
  {
    case: 'IE-004',
    why: 'suspect asbestos: stop and refer, never collect or keep cutting',
    stem: 'cutting fibre-cement sheet',
    safe: 'Stop that work; refer licensed assessor',
    unsafe: ['Collect the offcuts for lab testing', 'Continue; bonded sheet is always safe'],
  },
  {
    case: 'IE-004',
    why: 'more than 10 m² of non-friable asbestos needs a licensed removalist in Queensland',
    stem: '14.4 m² must come out',
    safe: 'A Class A or B removalist',
    unsafe: ['The shopfitter, as it is bonded', 'Anyone wearing a P2 face mask'],
  },
  {
    case: 'IE-004',
    why: 'Queensland 2027: softwood dust stays on the WES until 1 December 2029',
    stem: 'softwood dust for the framing crew',
    safe: 'The WES continues until 1 December 2029',
    unsafe: [
      'The new WEL applied from December 2026',
      'The pharmacy particle count sets the limit',
    ],
  },
  {
    case: 'IE-004',
    why: 'Queensland 2027: DPM has an interim 0.1 mg/m³ TWA (no-limit is flour dust)',
    stem: 'diesel particulate matter',
    safe: 'Interim 0.1 mg/m³ TWA until 2029',
    unsafe: ['No limit until 1 December 2029', 'The national WEL from December 2026'],
  },
  {
    case: 'IE-004',
    why: 'Queensland 2027: Portland cement stays on the WES until December 2029',
    stem: 'Portland cement for a slab patch',
    safe: 'The existing WES, until December 2029',
    unsafe: ['The new WEL, since December 2026'],
  },
  {
    case: 'IE-004',
    why: 'a workplace silica limit is not a customer clearance level',
    stem: "is 'clear' because silica is under 0.05",
    safe: 'A workplace limit is not clearance',
    unsafe: ['Yes, below 0.05 means customers safe', 'Yes, if the reading was 8-hour'],
  },
];

function quizFor(c: CaseId, quizzes: Quiz[] = quizFile.quizzes): Quiz {
  const q = quizzes.find((x) => x.quizId === CASE_QUIZ[c]);
  if (!q) throw new Error(`no quiz for ${c}`);
  return q;
}

/** Violations for one fixture against one quiz; [] means the unsafe answers are all wrong. */
function fixtureViolations(quiz: Quiz, f: Fixture): string[] {
  const matches = quiz.questions.filter((q) => q.questionText.includes(f.stem));
  if (matches.length !== 1)
    return [`${f.case}: stem "${f.stem}" matched ${matches.length} questions`];
  const q = matches[0];
  const out: string[] = [];
  const safeAt = q.options.indexOf(f.safe);
  if (safeAt === -1) out.push(`${f.case}: safe option "${f.safe}" missing`);
  else if (safeAt !== q.correctIndex) out.push(`${f.case}: safe option "${f.safe}" is not the key`);
  for (const u of f.unsafe) {
    const at = q.options.indexOf(u);
    if (at === -1) out.push(`${f.case}: unsafe option "${u}" missing (fixture is stale)`);
    else if (at === q.correctIndex) out.push(`${f.case}: UNSAFE option "${u}" is marked correct`);
  }
  return out;
}

describe('IE-001 to IE-004 case quizzes (GP-721)', () => {
  it('all four case quizzes exist with an 80 % pass mark and at least 8 questions', () => {
    for (const c of Object.keys(CASE_QUIZ) as CaseId[]) {
      const q = quizFor(c);
      expect(q.passPercentage, c).toBe(80);
      expect(q.questions.length, c).toBeGreaterThanOrEqual(8);
      for (const qq of q.questions) {
        expect(qq.correctIndex, `${c} ${qq.questionText}`).toBeGreaterThanOrEqual(0);
        expect(qq.correctIndex).toBeLessThan(qq.options.length);
        expect(qq.explanation.length).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('every case quiz is linked from a quiz lesson in the draft catalogue', () => {
    const linked = new Set(
      catalogue.courses[0].modules
        .flatMap((m) => m.lessons)
        .filter((l) => l.contentType === 'quiz')
        .map((l) => l.contentBody)
    );
    for (const id of Object.values(CASE_QUIZ)) expect(linked.has(id), id).toBe(true);
  });

  it('every case quiz is backed by evidence-ledger rows that name it', () => {
    for (const [c, id] of Object.entries(CASE_QUIZ)) {
      const rows = ledgerRows.filter((r) =>
        (r.also_in ?? []).some((s) => s.endsWith(`#quiz:${id}`))
      );
      expect(rows.length, c).toBeGreaterThanOrEqual(15);
      expect(
        rows.some((r) => r.status === 'VERIFIED'),
        c
      ).toBe(true);
    }
  });

  for (const f of FIXTURES) {
    it(`${f.case}: unsafe answers are marked wrong — ${f.why}`, () => {
      expect(fixtureViolations(quizFor(f.case), f)).toEqual([]);
    });
  }

  it('control: the check fails when an unsafe answer is made the key (planted)', () => {
    for (const f of FIXTURES) {
      const planted = structuredClone(quizFor(f.case));
      const q = planted.questions.find((x) => x.questionText.includes(f.stem))!;
      q.correctIndex = q.options.indexOf(f.unsafe[0]);
      const v = fixtureViolations(planted, f);
      expect(
        v.some((m) => m.includes('is marked correct')),
        `${f.case} ${f.stem}`
      ).toBe(true);
    }
  });

  it('control: a stale fixture (unsafe option removed from the quiz) is reported, not passed', () => {
    const f = FIXTURES[0];
    const planted = structuredClone(quizFor(f.case));
    const q = planted.questions.find((x) => x.questionText.includes(f.stem))!;
    q.options = q.options.map((o) => (o === f.unsafe[0] ? 'Something else entirely here' : o));
    expect(fixtureViolations(planted, f).some((m) => m.includes('missing'))).toBe(true);
  });

  it('no correct answer in a case quiz uses a workplace limit or a number as a home, pet or customer safe level', () => {
    const bad =
      /\b(?:below|under|above|over)\b[^;!?]{0,30}?\b(?:means?|is|are)\s+(?:\w+\s+)?(?:safe|unsafe|clear)\b|\bWEL\b[^.]{0,20}\bsafe\b/i;
    for (const c of Object.keys(CASE_QUIZ) as CaseId[]) {
      for (const q of quizFor(c).questions) {
        expect(bad.test(q.options[q.correctIndex]), `${c}: ${q.options[q.correctIndex]}`).toBe(
          false
        );
      }
    }
    // control: the pattern does catch the unsafe phrasings used as distractors
    expect(bad.test('Yes, below 0.05 means customers safe')).toBe(true);
    expect(bad.test('Yes, below the WEL means safe')).toBe(true);
  });
});
