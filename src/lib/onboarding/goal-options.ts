/**
 * Goal options offered by the first-session onboarding wizard.
 *
 * Kept as plain data (no JSX) so the rendered copy is importable by a unit test. Licence
 * (CLAUDE.md "CARSI designation rule"): a goal describes what the learner wants from CARSI. It
 * never brands anything with an IICRC Registered-Training-School designation title or acronym,
 * and never implies a CARSI course builds toward an IICRC discipline or certification. Pinned by
 * src/lib/server/onboarding-pathway.test.ts, which also scans OnboardingWizard.tsx so a label
 * hard-coded back into the wizard fails the suite.
 */

export type OnboardingGoalValue = 'new_cert' | 'cec_renewal' | 'career_change';

export interface OnboardingGoalOption {
  value: OnboardingGoalValue;
  label: string;
}

export const ONBOARDING_GOAL_OPTIONS: readonly OnboardingGoalOption[] = [
  { value: 'new_cert', label: 'Build depth in a new discipline area' },
  { value: 'cec_renewal', label: 'Renew my CECs' },
  { value: 'career_change', label: 'Career change into the industry' },
];
