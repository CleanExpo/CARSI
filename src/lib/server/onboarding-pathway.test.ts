import { describe, expect, it } from 'vitest';

import { ONBOARDING_FLOW, wizardGoalLabels } from '@/components/lms/onboarding-flow';
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
 * CARSI recommends a discipline AREA to start in. The goal step and the rendered recommendation
 * copy never carry an IICRC Registered-Training-School designation title or acronym, and make no
 * IICRC, CEC, certification or accreditation claim at all, except for sentences allow-listed
 * verbatim below. Both repo licence guards passed while the old copy was live (observed on
 * carsi.com.au 2026-09-03), so this file is the control that fails if any of it comes back.
 *
 * The wizard's step data is imported from the module the component renders from, so a label
 * smuggled in through any constant or expression is still the label under test.
 */

// Exact strings rendered on 2026-09-03 (WS1 walk B, break 5) and the reviewers' mutants from
// the release-gate reviews of ff5eeceb and e41fedd5. Positive controls: every one is rejected.
const OLD_LABEL = 'Water Damage Restoration Technician (WRT)';
const OLD_DESCRIPTION =
  'Starting with Water Damage Restoration Technician (WRT) builds foundational credentials recognised across restoration employers in Australia.';
const OLD_GOAL_LABEL = 'Build toward a new IICRC discipline (CEC courses)';
const REVIEW_MUTANT_CLAIM = 'These courses prepare you for IICRC certification.';
const REVIEW_MUTANT_LOWERCASE_TITLE = 'Water damage restoration technician';

// The only sentences that may mention IICRC, CECs or certification in recommendation copy.
const ALLOWED_SENTENCES = [
  'Every CARSI credential is CARSI-issued; it is not an IICRC certification.',
  'Where the IICRC has approved a course, its CEC hours are shown on the course page.',
];
// The learner's own goal may name their own CECs (a statement about their standing, not ours).
const ALLOWED_GOAL_LABELS = ['Renew my CECs'];

const ACRONYMS = 'WRT|ASD|CRT|AMRT|FSRT|OCT|CCT|TCST';
// IICRC Registered-Training-School designation titles, by referent, any case.
const DESIGNATION_TITLE =
  /\b(water damage restoration|applied structural drying|carpet repair (and|&) reinstallation|applied microbial remediation|microbial remediation|fire (and|&) smoke restoration|odou?r control|commercial carpet(?: cleaning)?|carpet cleaning|upholstery (and|&) fabric cleaning|health (and|&) safety|trauma (and|&) crime scene)\s+technician\b/i;
// On surfaces that speak for CARSI, the bare word is enough to fail: no role option lives here.
const ANY_TECHNICIAN = /\btechnician\b/i;
const PARENTHESISED_ACRONYM = new RegExp(`\\((${ACRONYMS})\\)`, 'i');
const BARE_ACRONYM = new RegExp(`\\b(${ACRONYMS})\\b`, 'i');
const ALIGNED = /-aligned\b/i;
const LICENCE_WORDS = /IICRC|\bCECs?\b|certif|accredit|qualif|designation|registered training/i;
const MANGLED_CASE = /\b[a-z][A-Z]{2,}/;

function stripAllowed(text: string, allowed: readonly string[]): string {
  return allowed.reduce((acc, sentence) => acc.split(sentence).join(' '), text);
}

/** Designation-free: for any surface, including ones where a job role may appear. */
function assertDesignationFree(text: string) {
  expect(text).not.toMatch(DESIGNATION_TITLE);
  expect(text).not.toMatch(PARENTHESISED_ACRONYM);
  expect(text).not.toMatch(BARE_ACRONYM);
  expect(text).not.toMatch(ALIGNED);
  expect(text).not.toMatch(MANGLED_CASE);
}

/** Claim-free: for surfaces that speak for CARSI (recommendation copy, goal labels). */
function assertNoLicenceClaims(text: string, allowed: readonly string[] = ALLOWED_SENTENCES) {
  assertDesignationFree(text);
  expect(text).not.toMatch(ANY_TECHNICIAN);
  expect(stripAllowed(text, allowed)).not.toMatch(LICENCE_WORDS);
}

const UNKNOWN_CODES = ['TCST', 'ZZZ', 'wrt', '', 'WRT2'];
const GOALS = ['new_cert', 'cec_renewal', 'career_change', 'anything-else', undefined];

describe('onboarding pathway copy (licence)', () => {
  it('rejects the old copy and every review mutant (positive controls)', () => {
    expect(OLD_LABEL).toMatch(PARENTHESISED_ACRONYM);
    expect(OLD_LABEL).toMatch(DESIGNATION_TITLE);
    expect(OLD_DESCRIPTION).toMatch(BARE_ACRONYM);
    expect(REVIEW_MUTANT_LOWERCASE_TITLE).toMatch(DESIGNATION_TITLE);
    expect(REVIEW_MUTANT_LOWERCASE_TITLE).toMatch(ANY_TECHNICIAN);
    expect('water damage restoration (wrt)').toMatch(PARENTHESISED_ACRONYM);
    expect(stripAllowed(OLD_GOAL_LABEL, ALLOWED_GOAL_LABELS)).toMatch(LICENCE_WORDS);
    expect(stripAllowed(REVIEW_MUTANT_CLAIM, ALLOWED_SENTENCES)).toMatch(LICENCE_WORDS);
    // A claim appended beside an allow-listed sentence is still caught (only the exact literal
    // is stripped). The control avoids reproducing a banned selling form in source.
    expect(
      stripAllowed(`${ALLOWED_SENTENCES[1]} This qualifies you for insurer panels.`, ALLOWED_SENTENCES),
    ).toMatch(LICENCE_WORDS);
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

  it('the goal labels the wizard renders are the shared options and are claim-free', () => {
    const rendered = wizardGoalLabels();
    expect(rendered).toEqual(ONBOARDING_GOAL_OPTIONS.map((o) => o.label));
    expect(ONBOARDING_GOAL_OPTIONS.map((o) => o.value)).toEqual([
      'new_cert',
      'cec_renewal',
      'career_change',
    ]);
    for (const label of rendered) {
      expect(label).not.toBe(OLD_GOAL_LABEL);
      assertNoLicenceClaims(label, ALLOWED_GOAL_LABELS);
    }
  });

  it('no wizard step outside the learner-standing question brands anything with a designation', () => {
    for (const step of ONBOARDING_FLOW) {
      if (step.kind === 'multi') continue; // the learner's OWN IICRC disciplines: acronyms allowed
      assertDesignationFree(step.question);
      if (step.kind === 'single') {
        for (const answer of step.answers) assertDesignationFree(answer.label);
      }
    }
    const multi = ONBOARDING_FLOW.filter((s) => s.kind === 'multi');
    expect(multi).toHaveLength(1);
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
});
