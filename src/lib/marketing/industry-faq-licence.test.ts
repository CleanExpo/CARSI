/**
 * Licence sweep over every industry FAQ (FAQPage JSON-LD on each /industries/* page). Live on
 * 18/10/2026: /industries/plumbing-trades named training with an IICRC discipline acronym ("Most <acronym> courses take 8–12 hours") and promised
 * IICRC CECs on completion with no approved course named; /industries/transport-logistics sold
 * "carpet repair and reinstallation training", which CARSI does not offer. CLAUDE.md: CARSI
 * courses carry CARSI designations, never IICRC discipline acronyms; CEC hours only where the
 * IICRC has approved that course (data/seed/cec-approvals.json); and copy may only sell training
 * CARSI actually has.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getCecApprovalEntries, isCecApprovalCurrent } from '@/lib/seed/cec-approvals';

import { evaluateContent as complianceFindings } from '../../../scripts/check-iicrc-compliance.mjs';
import { scanText as terminologyFindings } from '../../../scripts/check-iicrc-terminology.mjs';
import { evaluate as standardsFindings } from '../../../scripts/check-standards-claims.mjs';

import * as marketing from './industry-track2';

type Faq = { question: string; answer: string };

const INDUSTRIES = join(process.cwd(), 'app', '(public)', 'industries');

// IICRC discipline acronyms, assembled so this file never spells the banned construction.
const ACRONYMS = 'WRT ASD AMRT FSRT CCT CRT OCT TCST RRT'.split(' ');
const ACRONYM = new RegExp(`\\b(?:${ACRONYMS.join('|')})\\b`);

/**
 * Topics CARSI does not sell. Evidence: the 80 live published course titles at
 * https://carsi.com.au/api/lms/courses on 18/10/2026 contain no carpet repair, reinstallation,
 * upholstery, leather or rug-repair course.
 */
const NOT_SOLD =
  /\b(carpet repair|reinstallation|re-installation|upholstery|leather|rug repair)\b/i;

/** A sentence that promises CECs, or calls a TOPIC "CEC-accredited", with no approval named. */
const CEC_PROMISE =
  /\b(receive|receives|earn|earns|earning|gain|gains|award|awards|get)\b[^.!?]{0,80}\b(CECs?|Continuing Education Credits?)\b|\bCEC[- ]accredited\s+(?:[a-z]+\s+){0,4}training\b/i;

/** "<named course> is/are IICRC CEC Accredited" must name a course with a current approval. */
const COURSE_IS_ACCREDITED = /\b(is|are)\s+IICRC CEC Accredited\b/;

const currentApprovedTitles = getCecApprovalEntries()
  .filter((e) => e.status === 'approved' && isCecApprovalCurrent(e))
  .map((e) => e.title as string);

function unquote(raw: string): string {
  return raw.replace(/\\(['"\\])/g, '$1');
}

/** Question/answer string literals inside `const faqs = [ … ]` in a page source. */
export function faqsFromSource(source: string): Faq[] {
  const start = source.search(/const faqs\s*(?::[^=]+)?=\s*\[/);
  if (start < 0) return [];
  let i = source.indexOf('[', start) + 1;
  let depth = 1;
  while (depth && i < source.length) {
    if (source[i] === '[') depth++;
    else if (source[i] === ']') depth--;
    i++;
  }
  const block = source.slice(start, i);
  const strings = (key: string) =>
    Array.from(
      block.matchAll(
        new RegExp(`${key}:\\s*(?:'((?:\\\\.|[^'\\\\])*)'|"((?:\\\\.|[^"\\\\])*)")`, 'g')
      ),
      (m) => unquote(m[1] ?? m[2])
    );
  const questions = strings('question');
  const answers = strings('answer');
  if (questions.length !== answers.length) throw new Error('unbalanced faqs block');
  return questions.map((question, k) => ({ question, answer: answers[k] }));
}

function allIndustryFaqs(): Array<[string, Faq[]]> {
  const out: Array<[string, Faq[]]> = [];
  for (const slug of readdirSync(INDUSTRIES)) {
    const file = join(INDUSTRIES, slug, 'page.tsx');
    if (!existsSync(file)) continue;
    const faqs = faqsFromSource(readFileSync(file, 'utf8'));
    if (faqs.length) out.push([`industries/${slug}`, faqs]);
  }
  for (const [name, value] of Object.entries(marketing)) {
    if (/faqs$/i.test(name) && Array.isArray(value))
      out.push([`industry-track2.${name}`, value as Faq[]]);
  }
  return out;
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

export function licenceProblems(faq: Faq): string[] {
  const problems: string[] = [];
  for (const line of [faq.question, faq.answer]) {
    if (ACRONYM.test(line)) problems.push(`discipline acronym: ${line.match(ACRONYM)![0]}`);
    if (NOT_SOLD.test(line))
      problems.push(`training CARSI does not sell: ${line.match(NOT_SOLD)![0]}`);
    for (const f of terminologyFindings('app/(public)/industries/x/page.tsx', line))
      problems.push(f.trim());
    for (const f of complianceFindings('app/(public)/industries/x/page.tsx', line))
      problems.push(String(f).trim());
    for (const f of standardsFindings(line)) problems.push(String(f).trim());
    for (const s of sentences(line)) {
      if (CEC_PROMISE.test(s) && !/\bapproved\b/i.test(s))
        problems.push(`CEC promise without an approval: ${s}`);
      // "Both are / It is IICRC CEC Accredited" refers back to titles named earlier in the answer.
      if (COURSE_IS_ACCREDITED.test(s) && !currentApprovedTitles.some((t) => line.includes(t)))
        problems.push(`"IICRC CEC Accredited" with no currently approved course named: ${s}`);
    }
  }
  return problems;
}

describe('industry FAQ licence sweep', () => {
  it('finds the FAQ sets (the sweep is not vacuous)', () => {
    const sets = allIndustryFaqs();
    expect(sets.length).toBeGreaterThanOrEqual(16);
    expect(sets.flatMap(([, f]) => f).length).toBeGreaterThan(60);
  });

  it('each check fires on the live 18/10/2026 copy it exists for', () => {
    const live: Faq = {
      question: 'Can I complete training online?',
      answer: `Most ${ACRONYMS[0]} courses take 8–12 hours. On completion, you receive a credential and IICRC Continuing Education Credits (CECs).`,
    };
    expect(licenceProblems(live).join('\n')).toMatch(/discipline acronym/);
    expect(licenceProblems(live).join('\n')).toMatch(/CEC promise without an approval/);
    expect(
      licenceProblems({
        question: 'Vehicles?',
        answer: 'CARSI carpet repair and reinstallation training covers buses.',
      }).join('\n')
    ).toMatch(/does not sell/);
    expect(
      licenceProblems({
        question: 'Data centres?',
        answer: 'CEC-accredited water restoration training equips teams.',
      }).join('\n')
    ).toMatch(/CEC promise/);
    expect(
      licenceProblems({
        question: 'Which course?',
        answer: 'Introduction to Nothing Real is IICRC CEC Accredited.',
      }).join('\n')
    ).toMatch(/no currently approved course/);
  });

  it('allows the compliant forms', () => {
    expect(
      licenceProblems({
        question: 'How do CECs work?',
        answer: `CARSI is an IICRC CEC Accredited provider. Where the IICRC has approved a course, its CEC hours are shown on the course page. ${currentApprovedTitles[0]} is IICRC CEC Accredited.`,
      })
    ).toEqual([]);
  });

  /**
   * Same class beyond the FAQ arrays (18/10/2026): nine industry pages offered "carpet repair"
   * or "carpet repair and reinstallation" training in their metadata, discipline lists, cards and
   * CTAs, and the /courses FAQ listed carpet repair among the catalogue's subjects.
   */
  it.each(
    readdirSync(INDUSTRIES)
      .filter((slug) => existsSync(join(INDUSTRIES, slug, 'page.tsx')))
      .map((slug) => [`industries/${slug}`, join(INDUSTRIES, slug, 'page.tsx')])
      .concat([
        ['courses (catalogue FAQ)', join(process.cwd(), 'app', '(public)', 'courses', 'page.tsx')],
      ])
  )('unsold: %s offers no training CARSI does not sell', (_name, file) => {
    const offers = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => NOT_SOLD.test(line) && !/^\s*(\/\/|\*)/.test(line));
    expect(offers).toEqual([]);
  });

  it.each(allIndustryFaqs())(
    '%s has no acronym, untied CEC promise or unsold training',
    (_name, faqs) => {
      const problems = faqs.flatMap((faq) =>
        licenceProblems(faq).map((p) => `${faq.question} → ${p}`)
      );
      expect(problems).toEqual([]);
    }
  );
});

/**
 * Review of feat/seo-app-ready (18/10/2026): a static FAQ saying "Introduction to Basic Carpet
 * Cleaning and Drying … is IICRC CEC Accredited" stays published after that approval expires
 * (2027-01-18). Static copy may only use provider-level or conditional CEC wording; any
 * course-specific statement has to be computed at request time from the registry.
 */
const COURSE_SPECIFIC_CEC = /\b(?:is|are|all)\s+IICRC CEC Accredited\b|IICRC CEC Accredited titles?/i;

describe('static CEC wording', () => {
  it('static CEC: the check fires on the time-sensitive forms', () => {
    expect(COURSE_SPECIFIC_CEC.test('It is IICRC CEC Accredited, with its CEC hours shown.')).toBe(true);
    expect(COURSE_SPECIFIC_CEC.test('Both are IICRC CEC Accredited.')).toBe(true);
    expect(COURSE_SPECIFIC_CEC.test('… all IICRC CEC Accredited, each with its hours shown.')).toBe(true);
    expect(COURSE_SPECIFIC_CEC.test('CARSI is an IICRC CEC Accredited provider.')).toBe(false);
    expect(
      COURSE_SPECIFIC_CEC.test('Where the IICRC has approved a course, its CEC hours are shown on the course page.')
    ).toBe(false);
  });

  it.each(allIndustryFaqs())('static CEC: %s names no course as IICRC CEC Accredited', (_name, faqs) => {
    const hits = faqs
      .flatMap((f) => [f.question, f.answer])
      .flatMap((t) => sentences(t))
      .filter((sentence) => COURSE_SPECIFIC_CEC.test(sentence) && !/\bprovider\b/.test(sentence));
    expect(hits).toEqual([]);
  });
});

