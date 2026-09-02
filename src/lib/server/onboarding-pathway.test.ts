import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ONBOARDING_GOAL_OPTIONS } from '@/lib/onboarding/goal-options';

import {
  FALLBACK_PATHWAY_LABEL,
  KNOWN_PATHWAY_CODES,
  pathwayDescription,
  pathwayLabel,
  resolveRecommendedPathwayCode,
} from './onboarding-pathway';

/**
 * Licence guard for the first-session onboarding wizard (CLAUDE.md "CARSI designation rule").
 *
 * CARSI recommends a discipline AREA to start in. Rendered recommendation copy never brands
 * that recommendation with an IICRC Registered-Training-School designation title or acronym,
 * and makes no IICRC, CEC, certification or accreditation claim at all, except for two
 * sanctioned sentences allow-listed verbatim below. Both repo licence guards passed while the
 * old copy was live (observed on carsi.com.au 2026-09-03), so this file is the control that
 * fails if any of it comes back, including a label hard-coded back into the wizard.
 */

// Exact strings rendered on 2026-09-03 (WS1 walk B, break 5) and the reviewer's mutants from
// the release-gate review of ff5eeceb. Positive controls: every one must be rejected.
const OLD_LABEL = 'Water Damage Restoration Technician (WRT)';
const OLD_DESCRIPTION =
  'Starting with Water Damage Restoration Technician (WRT) builds foundational credentials recognised across restoration employers in Australia.';
const OLD_GOAL_LABEL = 'Build toward a new IICRC discipline (CEC courses)';
const REVIEW_MUTANT = 'These courses prepare you for IICRC certification.';

// The only sentences that may mention IICRC, CECs or certification in rendered copy. Anything
// else that does so is a claim this surface is not allowed to make.
const ALLOWED_SENTENCES = [
  'Every CARSI credential is CARSI-issued; it is not an IICRC certification.',
  'Where the IICRC has approved a course, its CEC hours are shown on the course page.',
];
// The learner's own goal may name their own CECs (a statement about their standing, not ours).
const ALLOWED_GOAL_LABELS = ['Renew my CECs'];

const ACRONYMS = 'WRT|ASD|CRT|AMRT|FSRT|OCT|CCT|TCST';
const DESIGNATION_TITLE = /\bTechnician\b/;
const PARENTHESISED_ACRONYM = new RegExp(`\\((${ACRONYMS})\\)`);
const BARE_ACRONYM = new RegExp(`\\b(${ACRONYMS})\\b`);
const ALIGNED = /-aligned\b/i;
const LICENCE_WORDS = /IICRC|\bCECs?\b|certif|accredit|qualif|designation|registered training/i;
const MANGLED_CASE = /\b[a-z][A-Z]{2,}/;

function stripAllowed(text: string, allowed: readonly string[]): string {
  return allowed.reduce((acc, sentence) => acc.split(sentence).join(' '), text);
}

function assertDesignationFree(text: string) {
  expect(text).not.toMatch(DESIGNATION_TITLE);
  expect(text).not.toMatch(PARENTHESISED_ACRONYM);
  expect(text).not.toMatch(BARE_ACRONYM);
  expect(text).not.toMatch(ALIGNED);
  expect(text).not.toMatch(MANGLED_CASE);
}

function assertNoLicenceClaims(text: string, allowed: readonly string[] = ALLOWED_SENTENCES) {
  assertDesignationFree(text);
  expect(stripAllowed(text, allowed)).not.toMatch(LICENCE_WORDS);
}

const UNKNOWN_CODES = ['TCST', 'ZZZ', 'wrt', '', 'WRT2'];
const GOALS = ['new_cert', 'cec_renewal', 'career_change', 'anything-else', undefined];

describe('onboarding pathway copy (licence)', () => {
  it('rejects the old copy and the review mutants (positive controls)', () => {
    expect(OLD_LABEL).toMatch(PARENTHESISED_ACRONYM);
    expect(OLD_LABEL).toMatch(DESIGNATION_TITLE);
    expect(OLD_DESCRIPTION).toMatch(BARE_ACRONYM);
    expect(stripAllowed(OLD_GOAL_LABEL, ALLOWED_GOAL_LABELS)).toMatch(LICENCE_WORDS);
    expect(stripAllowed(REVIEW_MUTANT, ALLOWED_SENTENCES)).toMatch(LICENCE_WORDS);
    expect(stripAllowed(`Based on your selections. ${REVIEW_MUTANT}`, ALLOWED_SENTENCES)).toMatch(
      LICENCE_WORDS,
    );
    expect('Based on your selections, tCST is a practical place to start.').toMatch(MANGLED_CASE);
  });

  it('every known code has a discipline-area label with no designation or claim', () => {
    expect(KNOWN_PATHWAY_CODES.length).toBeGreaterThan(0);
    for (const code of KNOWN_PATHWAY_CODES) {
      const label = pathwayLabel(code);
      expect(label).not.toBe(code);
      expect(label).not.toBe(OLD_LABEL);
      assertNoLicenceClaims(label);
    }
  });

  it('an unknown code never renders as itself; it falls back to a generic area', () => {
    for (const code of UNKNOWN_CODES) {
      expect(pathwayLabel(code)).toBe(FALLBACK_PATHWAY_LABEL);
      assertNoLicenceClaims(pathwayLabel(code));
    }
  });

  it('descriptions for every code and goal carry no designation and no unsanctioned claim', () => {
    for (const code of [...KNOWN_PATHWAY_CODES, ...UNKNOWN_CODES]) {
      for (const goal of GOALS) {
        const text = pathwayDescription(code, goal);
        expect(text).not.toBe(OLD_DESCRIPTION);
        assertNoLicenceClaims(text);
      }
    }
  });

  it('career-change copy carries the CARSI-issued sentence; renewal copy makes no CEC claim of its own', () => {
    expect(pathwayDescription('WRT', 'career_change')).toContain(ALLOWED_SENTENCES[0]);
    const renewal = pathwayDescription('WRT', 'cec_renewal');
    expect(renewal).toContain(ALLOWED_SENTENCES[1]);
    expect(stripAllowed(renewal, ALLOWED_SENTENCES)).not.toMatch(LICENCE_WORDS);
  });

  it('goal options are designation-free and make no claim beyond the learner\'s own CECs', () => {
    expect(ONBOARDING_GOAL_OPTIONS.map((o) => o.value)).toEqual([
      'new_cert',
      'cec_renewal',
      'career_change',
    ]);
    for (const option of ONBOARDING_GOAL_OPTIONS) {
      expect(option.label).not.toBe(OLD_GOAL_LABEL);
      assertNoLicenceClaims(option.label, ALLOWED_GOAL_LABELS);
    }
  });

  it('routing: known codes resolve as before; unknown input never becomes the recommendation', () => {
    expect(resolveRecommendedPathwayCode({ primary_goal: 'career_change' })).toBe('WRT');
    expect(resolveRecommendedPathwayCode({ primary_goal: 'cec_renewal' })).toBe('WRT');
    expect(resolveRecommendedPathwayCode({ disciplines_held: ['AMRT'] })).toBe('AMRT');
    expect(resolveRecommendedPathwayCode({ industry: 'construction' })).toBe('ASD');
    expect(resolveRecommendedPathwayCode({ disciplines_held: ['TCST', 'FSRT'] })).toBe('FSRT');
    for (const code of UNKNOWN_CODES) {
      const resolved = resolveRecommendedPathwayCode({ disciplines_held: [code] });
      expect(KNOWN_PATHWAY_CODES).toContain(resolved);
      expect(resolved).not.toBe(code);
    }
  });

  it('the wizard takes its goal labels from the shared module and hard-codes none', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/lms/OnboardingWizard.tsx'), 'utf8');
    expect(source).toContain('ONBOARDING_GOAL_OPTIONS');
    const start = source.indexOf("key: 'primary_goal'");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf('kind:', start);
    const goalStep = source.slice(start, end === -1 ? undefined : end);
    expect(goalStep).toContain('ONBOARDING_GOAL_OPTIONS');
    expect(goalStep).not.toMatch(/label:\s*['"`]/);
    expect(goalStep).not.toMatch(DESIGNATION_TITLE);
    // Whole-file checks: the role step legitimately says "Field Technician" and the disciplines
    // step legitimately asks about the learner's OWN IICRC standing, so only branding forms are
    // banned file-wide.
    expect(source).not.toContain(OLD_GOAL_LABEL);
    expect(source).not.toMatch(/toward[^'"\n]*IICRC/i);
    expect(source).not.toMatch(PARENTHESISED_ACRONYM);
    expect(source).not.toMatch(ALIGNED);
  });
});
