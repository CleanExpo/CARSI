import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ONBOARDING_FLOW, wizardGoalLabels } from '@/components/lms/onboarding-flow';
import {
  OnboardingWizard,
  wizardResultFromResponse,
  type WizardResult,
} from '@/components/lms/OnboardingWizard';
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
 * copy never carry an IICRC designation title or acronym, and make no IICRC, CEC, certification
 * or accreditation claim at all, except for sentences allow-listed verbatim below. Both repo
 * licence guards passed while the old copy was live (observed on carsi.com.au 2026-09-03), so
 * this file is the control that fails if any of it comes back.
 *
 * Two boundaries are under test. The wizard's step data is imported from the module the
 * component renders from, so a label smuggled in through any constant or expression in that
 * module is the label under test. The component itself is then rendered (static markup) at every
 * step and on the recommendation screen, so a label rewritten inside its render is under test
 * too: what reaches the markup is what is checked.
 *
 * The title and acronym lists below follow the IICRC's own certifications page
 * (iicrc.org/iicrccertifications, read 2026-09-03) and its Master and Journeyman designations
 * (iicrc.org/iicrcmaster). No list of names stays complete, so two structural checks back them:
 * the credential nouns IICRC titles are built from, and a rule that any all-caps token this copy
 * does not legitimately use is an acronym we failed to list.
 */

// Exact strings rendered on 2026-09-03 (WS1 walk B, break 5) and the reviewers' mutants from
// the release-gate reviews of ff5eeceb, e41fedd5, 5da8339b and 6bab44b2. Positive controls:
// every one is rejected.
const OLD_LABEL = 'Water Damage Restoration Technician (WRT)';
const OLD_DESCRIPTION =
  'Starting with Water Damage Restoration Technician (WRT) builds foundational credentials recognised across restoration employers in Australia.';
const OLD_GOAL_LABEL = 'Build toward a new IICRC discipline (CEC courses)';
const REVIEW_MUTANT_CLAIM = 'These courses prepare you for IICRC certification.';
const REVIEW_MUTANT_LOWERCASE_TITLE = 'Water damage restoration technician';
const REVIEW_MUTANT_MASTER_TITLE = 'Master Water Restorer';
const REVIEW_MUTANT_CURRENT_ACRONYM = 'Field Technician (BMI)';
const REVIEW_MUTANT_CURRENT_TITLE = 'Building Moisture Inspection';

// The only sentences that may mention IICRC, CECs or certification in recommendation copy.
const ALLOWED_SENTENCES = [
  'Every CARSI credential is CARSI-issued; it is not an IICRC certification.',
  'Where the IICRC has approved a course, its CEC hours are shown on the course page.',
];
// The learner's own goal may name their own CECs (a statement about their standing, not ours).
const ALLOWED_GOAL_LABELS = ['Renew my CECs'];

// Acronyms of the current IICRC certifications, plus the Master and Journeyman designations and
// the older Building Moisture Thermography name, any case.
const ACRONYMS =
  'WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|CPT|FCT|HCT|HST|LCT|RCT|SMT|TCST|UFT|RFMT|WFMT|BMI|BMT|BCI|CDS|MRS|ISSI|RFI|WFI|WLFI|SCI|MWR|MTC|MFSR|JWR|JTC|JFSR';
// IICRC designation titles by referent, any case: the technician family...
const TECHNICIAN_REFERENTS =
  'water damage restoration|applied structural drying|applied microbial remediation|microbial remediation|fire (?:and|&) smoke (?:damage )?restoration|odou?r control|carpet cleaning|commercial carpet(?: cleaning| maintenance)?|carpet repair (?:and|&) reinstallation|colou?r repair|upholstery (?:and|&) fabric cleaning|health (?:and|&) safety|trauma (?:and|&) crime scene|leather cleaning|rug cleaning|stone,? masonry (?:and|&) ceramic tile cleaning|floor care|resilient flooring maintenance|wood floor maintenance|contents? processing|house cleaning';
// ...and the titles that never carry the word "technician".
const OTHER_TITLES =
  '(?:master|journeyman)\\s+(?:water|textile|fire (?:and|&) smoke)\\s+(?:restorer|cleaner)|commercial drying specialist|mou?ld remediation specialist|building moisture (?:inspection|thermography)|building construction identification|(?:senior )?carpet inspector|resilient flooring inspector|wood (?:floor|(?:and|&) laminate flooring) inspector|introduction to substrate (?:and|&) subfloor inspection';
const DESIGNATION_TITLE = new RegExp(
  `\\b(?:(?:${TECHNICIAN_REFERENTS})\\s+technician|${OTHER_TITLES})\\b`,
  'i',
);
// Nouns IICRC builds its credential titles from. None may appear on any wizard step or in
// recommendation copy, learner-standing steps included: a title carrying one of these words is
// a designation whether or not the referent list above knows it. "Technician" is handled
// separately because the role step legitimately offers a job role.
const CREDENTIAL_NOUNS = /\b(master|journeyman|specialist|restorer|inspector|inspection)\b/i;
// On surfaces that speak for CARSI, the bare word is enough to fail: no role option lives here.
const ANY_TECHNICIAN = /\btechnician\b/i;
const PARENTHESISED_ACRONYM = new RegExp(`\\((${ACRONYMS})\\)`, 'i');
const BARE_ACRONYM = new RegExp(`\\b(${ACRONYMS})\\b`, 'i');
// Backstop for the acronym list: outside the learner-standing question this copy uses exactly
// four all-caps tokens (our name, the body's name, the renewal step's SMS option, and CEC inside
// the allow-listed sentence). Any other all-caps token is an acronym the list above missed.
const UNKNOWN_CAPS_TOKEN = /\b(?!(?:CARSI|IICRC|SMS|CEC)\b)[A-Z]{2,6}\b/;
// And the designation form itself, "<title> (<acronym>)", in any case: nothing on these surfaces
// legitimately puts a short token in parentheses ("(optional)" is longer than six letters).
const PARENTHESISED_TOKEN = /\([A-Za-z]{2,6}\)/;
const ALIGNED = /-aligned\b/i;
const LICENCE_WORDS = /IICRC|\bCECs?\b|certif|accredit|qualif|designation|registered training/i;
const MANGLED_CASE = /\b[a-z][A-Z]{2,}/;

function stripAllowed(text: string, allowed: readonly string[]): string {
  return allowed.reduce((acc, sentence) => acc.split(sentence).join(' '), text);
}

/** No designation title in any form, on any surface, learner-standing steps included. */
function assertNoDesignationTitle(text: string) {
  expect(text).not.toMatch(DESIGNATION_TITLE);
  expect(text).not.toMatch(CREDENTIAL_NOUNS);
  expect(text).not.toMatch(ALIGNED);
  expect(text).not.toMatch(MANGLED_CASE);
}

/** Designation-free: no title and no acronym. For any surface where a job role may appear. */
function assertDesignationFree(text: string) {
  assertNoDesignationTitle(text);
  expect(text).not.toMatch(PARENTHESISED_ACRONYM);
  expect(text).not.toMatch(BARE_ACRONYM);
  expect(text).not.toMatch(UNKNOWN_CAPS_TOKEN);
  expect(text).not.toMatch(PARENTHESISED_TOKEN);
}

/** Claim-free: for surfaces that speak for CARSI (recommendation copy, goal labels). */
function assertNoLicenceClaims(text: string, allowed: readonly string[] = ALLOWED_SENTENCES) {
  assertDesignationFree(text);
  expect(text).not.toMatch(ANY_TECHNICIAN);
  expect(stripAllowed(text, allowed)).not.toMatch(LICENCE_WORDS);
}

/** The text a browser would show for static markup: tags dropped, React's escapes undone. */
function renderedText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

const noop = () => {};

/** The real component, opened at a step, exactly as it renders. */
function renderWizardAtStep(index: number): string {
  return renderedText(
    renderToStaticMarkup(
      createElement(OnboardingWizard, { isOpen: true, initialStep: index, onComplete: noop }),
    ),
  );
}

/** The real component, opened on its recommendation screen, exactly as it renders. */
function renderWizardResult(result: WizardResult): string {
  return renderedText(
    renderToStaticMarkup(
      createElement(OnboardingWizard, { isOpen: true, initialResult: result, onComplete: noop }),
    ),
  );
}

const UNKNOWN_CODES = ['TCST', 'ZZZ', 'wrt', '', 'WRT2'];
const GOALS = ['new_cert', 'cec_renewal', 'career_change', 'anything-else', undefined];
const ALL_CODES = [...KNOWN_PATHWAY_CODES, ...UNKNOWN_CODES];

describe('onboarding pathway copy (licence)', () => {
  it('rejects the old copy and every review mutant (positive controls)', () => {
    expect(OLD_LABEL).toMatch(PARENTHESISED_ACRONYM);
    expect(OLD_LABEL).toMatch(DESIGNATION_TITLE);
    expect(OLD_DESCRIPTION).toMatch(BARE_ACRONYM);
    expect(REVIEW_MUTANT_LOWERCASE_TITLE).toMatch(DESIGNATION_TITLE);
    expect(REVIEW_MUTANT_LOWERCASE_TITLE).toMatch(ANY_TECHNICIAN);
    expect('water damage restoration (wrt)').toMatch(PARENTHESISED_ACRONYM);
    // Titles without the word "technician": the referent list knows these...
    expect(REVIEW_MUTANT_MASTER_TITLE).toMatch(DESIGNATION_TITLE);
    expect('journeyman fire & smoke restorer').toMatch(DESIGNATION_TITLE);
    expect('Commercial Drying Specialist').toMatch(DESIGNATION_TITLE);
    expect('Mould Remediation Specialist').toMatch(DESIGNATION_TITLE);
    expect('Senior Carpet Inspector').toMatch(DESIGNATION_TITLE);
    expect('Wood and Laminate Flooring Inspector').toMatch(DESIGNATION_TITLE);
    expect(REVIEW_MUTANT_CURRENT_TITLE).toMatch(DESIGNATION_TITLE);
    expect('Building Moisture Thermography').toMatch(DESIGNATION_TITLE);
    expect('Building Construction Identification').toMatch(DESIGNATION_TITLE);
    expect('Fire and Smoke Damage Restoration Technician').toMatch(DESIGNATION_TITLE);
    expect('Color Repair Technician').toMatch(DESIGNATION_TITLE);
    // ...and the credential nouns fail a title the list does not know.
    expect(REVIEW_MUTANT_MASTER_TITLE).toMatch(CREDENTIAL_NOUNS);
    expect(REVIEW_MUTANT_CURRENT_TITLE).toMatch(CREDENTIAL_NOUNS);
    expect('Senior Rug Inspector').not.toMatch(DESIGNATION_TITLE);
    expect('Senior Rug Inspector').toMatch(CREDENTIAL_NOUNS);
    // Acronyms: the current list, the older name, and the backstop for one the list misses.
    expect(REVIEW_MUTANT_CURRENT_ACRONYM).toMatch(PARENTHESISED_ACRONYM);
    expect('Master Water Restorer (MWR)').toMatch(PARENTHESISED_ACRONYM);
    expect('holds the CDS').toMatch(BARE_ACRONYM);
    expect('holds the BMT').toMatch(BARE_ACRONYM);
    expect('Field Technician (QQQ)').not.toMatch(PARENTHESISED_ACRONYM);
    expect('Field Technician (QQQ)').toMatch(UNKNOWN_CAPS_TOKEN);
    expect('Field Technician QQQ').toMatch(UNKNOWN_CAPS_TOKEN);
    expect('Field Technician (Qqq)').not.toMatch(UNKNOWN_CAPS_TOKEN);
    expect('Field Technician (Qqq)').toMatch(PARENTHESISED_TOKEN);
    // Negative controls: a job role, area copy and the four legitimate tokens pass.
    expect('Field Technician').not.toMatch(DESIGNATION_TITLE);
    expect('Field Technician').not.toMatch(CREDENTIAL_NOUNS);
    expect('Field Technician').not.toMatch(UNKNOWN_CAPS_TOKEN);
    expect('Australian restoration employers').not.toMatch(CREDENTIAL_NOUNS);
    expect('Renew my CECs').not.toMatch(UNKNOWN_CAPS_TOKEN);
    expect('Already IICRC certified').not.toMatch(UNKNOWN_CAPS_TOKEN);
    expect('SMS reminders').not.toMatch(UNKNOWN_CAPS_TOKEN);
    expect(ALLOWED_SENTENCES[0]).not.toMatch(UNKNOWN_CAPS_TOKEN);
    expect(ALLOWED_SENTENCES[1]).not.toMatch(UNKNOWN_CAPS_TOKEN);
    expect('Renewal & reminders (optional)').not.toMatch(PARENTHESISED_TOKEN);
    expect('Email me about unfinished lessons (opt-in)').not.toMatch(PARENTHESISED_TOKEN);
    expect(stripAllowed(OLD_GOAL_LABEL, ALLOWED_GOAL_LABELS)).toMatch(LICENCE_WORDS);
    expect(stripAllowed(REVIEW_MUTANT_CLAIM, ALLOWED_SENTENCES)).toMatch(LICENCE_WORDS);
    // A claim appended beside an allow-listed sentence is still caught (only the exact literal
    // is stripped). The control avoids reproducing a banned selling form in source.
    expect(
      stripAllowed(`${ALLOWED_SENTENCES[1]} This qualifies you for insurer panels.`, ALLOWED_SENTENCES),
    ).toMatch(LICENCE_WORDS);
    expect('Based on your selections, tCST is a practical place to start.').toMatch(MANGLED_CASE);
    // The markup reader keeps what a browser shows and drops the rest.
    expect(renderedText('<p class="x">What&#x27;s <b>your</b> &amp; role?</p>')).toBe(
      "What's your & role?",
    );
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
    for (const code of ALL_CODES) {
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

  it('the goal labels in the step data are the shared options and are claim-free', () => {
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

  it('no wizard step brands anything with a designation title; only the learner-standing question shows acronyms', () => {
    for (const step of ONBOARDING_FLOW) {
      assertNoDesignationTitle(step.question);
      if (step.kind === 'multi') {
        // The learner's OWN IICRC disciplines: acronyms allowed here, titles still not.
        for (const option of step.options) assertNoDesignationTitle(option.label);
        continue;
      }
      assertDesignationFree(step.question);
      if (step.kind === 'single') {
        for (const answer of step.answers) assertDesignationFree(answer.label);
      }
    }
    const multi = ONBOARDING_FLOW.filter((s) => s.kind === 'multi');
    expect(multi).toHaveLength(1);
    expect(multi[0].key).toBe('disciplines_held');
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

describe('onboarding wizard as rendered (licence)', () => {
  it('opens at the first step by default', () => {
    const text = renderedText(
      renderToStaticMarkup(createElement(OnboardingWizard, { isOpen: true, onComplete: noop })),
    );
    expect(text).toContain(ONBOARDING_FLOW[0].question);
  });

  it('renders every step from the step data, and what it renders passes the same checks', () => {
    expect(ONBOARDING_FLOW.length).toBeGreaterThan(0);
    ONBOARDING_FLOW.forEach((step, index) => {
      const text = renderWizardAtStep(index);
      expect(text).toContain(step.question);
      if (step.kind === 'multi') {
        for (const option of step.options) expect(text).toContain(option.value);
        assertNoDesignationTitle(text);
        return;
      }
      if (step.kind === 'single') {
        for (const answer of step.answers) expect(text).toContain(answer.label);
      }
      assertDesignationFree(text);
    });
  });

  it('the goal step as rendered shows the shared labels and nothing that claims', () => {
    const index = ONBOARDING_FLOW.findIndex((s) => s.kind === 'single' && s.key === 'primary_goal');
    expect(index).toBeGreaterThanOrEqual(0);
    const text = renderWizardAtStep(index);
    for (const option of ONBOARDING_GOAL_OPTIONS) expect(text).toContain(option.label);
    expect(text).not.toContain(OLD_GOAL_LABEL);
    expect(text).not.toContain(REVIEW_MUTANT_CLAIM);
    assertNoLicenceClaims(text, ALLOWED_GOAL_LABELS);
  });

  it('the recommendation screen shows the label and description for every code and goal, and nothing that claims', () => {
    for (const code of ALL_CODES) {
      for (const goal of GOALS) {
        const result = wizardResultFromResponse({
          recommended_pathway: code,
          pathway_label: pathwayLabel(code),
          pathway_description: pathwayDescription(code, goal),
          suggested_courses_url: '/dashboard/courses',
        });
        const text = renderWizardResult(result);
        expect(text).toContain(pathwayLabel(code));
        expect(text).toContain(pathwayDescription(code, goal));
        assertNoLicenceClaims(text);
      }
    }
  });

  it('a response without a label never puts the raw code on screen', () => {
    for (const code of ALL_CODES) {
      const result = wizardResultFromResponse({
        recommended_pathway: code,
        pathway_description: pathwayDescription(code),
        suggested_courses_url: '/dashboard/courses',
      });
      expect(result.pathwayLabel).toBe(pathwayLabel(code));
      expect(result.pathwayLabel).not.toBe(code);
      assertNoLicenceClaims(renderWizardResult(result));
    }
  });
});
