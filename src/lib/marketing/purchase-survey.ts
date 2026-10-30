/**
 * Payment-success purchase survey (Authority Machine slice 1b): the two optional questions,
 * their allowlists, and validation. Answers are stored on the Stripe PaymentIntent metadata as
 * `svy_ind`, `svy_via` and `svy_at`.
 *
 * Privacy (APP 3/5): controlled choices only. There is no free-text field: "Other" is stored as
 * the word `other`, and any other field in the request is ignored, so nothing a buyer types can
 * reach the payment record.
 */

export interface SurveyOption {
  value: string;
  label: string;
}

export const INDUSTRY_OPTIONS = [
  { value: 'restoration_technician', label: 'Restoration or water-damage technician' },
  { value: 'carpet_floor_care', label: 'Carpet or floor care' },
  { value: 'commercial_cleaning', label: 'Commercial cleaning' },
  { value: 'facility_manager', label: 'Facility or building manager' },
  { value: 'property_strata_manager', label: 'Property or strata manager' },
  { value: 'builder_trade', label: 'Builder or construction trade' },
  { value: 'insurance_claims', label: 'Insurance, claims or loss adjusting' },
  { value: 'healthcare_aged_care', label: 'Healthcare or aged-care facility' },
  { value: 'whs_safety', label: 'WHS or safety' },
  { value: 'student_career_change', label: 'Student or career changer' },
  { value: 'other', label: 'Other' },
] as const satisfies readonly SurveyOption[];

export const FOUND_VIA_OPTIONS = [
  { value: 'google_search', label: 'Google search' },
  { value: 'ai_assistant', label: 'An AI assistant (ChatGPT, Claude and similar)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook_instagram', label: 'Facebook or Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'colleague_employer', label: 'A colleague or employer' },
  { value: 'industry_body', label: 'An industry body, newsletter or provider list' },
  { value: 'other', label: 'Other' },
] as const satisfies readonly SurveyOption[];

export type IndustryValue = (typeof INDUSTRY_OPTIONS)[number]['value'];
export type FoundViaValue = (typeof FOUND_VIA_OPTIONS)[number]['value'];

export const SURVEY_PURPOSE_NOTICE =
  'Optional. We use your answers to decide which courses to build. We keep them with your order and never show them next to your name.';

export interface SurveyAnswers {
  industry?: IndustryValue;
  found_via?: FoundViaValue;
}

export type SurveyValidation = { ok: true; value: SurveyAnswers } | { ok: false; error: string };

const INDUSTRY_VALUES: readonly string[] = INDUSTRY_OPTIONS.map((o) => o.value);
const FOUND_VIA_VALUES: readonly string[] = FOUND_VIA_OPTIONS.map((o) => o.value);

export function validateSurvey(input: unknown): SurveyValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Invalid answers.' };
  }
  const body = input as Record<string, unknown>;
  const value: SurveyAnswers = {};

  if (body.industry != null) {
    if (typeof body.industry !== 'string' || !INDUSTRY_VALUES.includes(body.industry)) {
      return { ok: false, error: 'Unknown answer for "What work do you do?".' };
    }
    value.industry = body.industry as IndustryValue;
  }

  if (body.found_via != null) {
    if (typeof body.found_via !== 'string' || !FOUND_VIA_VALUES.includes(body.found_via)) {
      return { ok: false, error: 'Unknown answer for "How did you find us?".' };
    }
    value.found_via = body.found_via as FoundViaValue;
  }

  if (!value.industry && !value.found_via) return { ok: false, error: 'No answer given.' };
  return { ok: true, value };
}

/** Stripe PaymentIntent metadata for validated answers. `svy_at` marks the survey as answered. */
export function surveyMetadata(answers: SurveyAnswers, now: Date): Record<string, string> {
  return {
    ...(answers.industry ? { svy_ind: answers.industry } : {}),
    ...(answers.found_via ? { svy_via: answers.found_via } : {}),
    svy_at: now.toISOString().slice(0, 10),
  };
}
