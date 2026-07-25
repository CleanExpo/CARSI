import { resolveLmsCourseCecHours } from '@/lib/server/course-cec-hours';

/** IICRC CEC auto-submission configuration (course completion → renewals@iicrcnet.org). */

export const DEFAULT_IICRC_CEC_SUBMISSION_EMAIL = 'renewals@iicrcnet.org';

export function getIicrcCecSubmissionEmail(): string {
  const v = process.env.IICRC_CEC_SUBMISSION_EMAIL?.trim();
  return v || DEFAULT_IICRC_CEC_SUBMISSION_EMAIL;
}

/**
 * Auto-submission to the IICRC is FAIL-CLOSED: off unless explicitly enabled.
 *
 * Emailing renewals@iicrcnet.org asserts a CEC claim on a learner's behalf. Per
 * CLAUDE.md that claim is licence-critical and valid only after per-course IICRC
 * approval confirmed by the founder — so the absence of configuration must mean
 * "do not submit", never "submit". This previously defaulted to ON, which sent a
 * live submission for a course that had no approval (2026-07-17).
 *
 * When false, submissions are recorded as `skipped` with reason `auto_submit_disabled`.
 */
export function isIicrcCecAutoSubmitEnabled(): boolean {
  const v = process.env.IICRC_CEC_AUTO_SUBMIT?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

export function resolveEffectiveCecHours(course: {
  slug?: string | null;
  cecHours: unknown;
  shortDescription?: string | null;
  description?: string | null;
  meta?: unknown;
  durationHours?: number | null;
  iicrcDiscipline?: string | null;
}): number | null {
  // REGISTRY-ONLY, FAIL-CLOSED (licence-critical, GP-498). The stored `cecHours` is NOT
  // consulted — it is WP-import pollution, not IICRC approval. CEC hours resolve solely from
  // the founder-confirmed approvals registry (by slug); no slug → no CEC.
  const slug = course.slug?.trim();
  if (!slug) return null;

  return resolveLmsCourseCecHours({
    slug,
    cecHours: null,
    shortDescription: course.shortDescription,
    description: course.description,
    meta: course.meta,
    durationHours: course.durationHours,
    iicrcDiscipline: course.iicrcDiscipline,
  });
}

export function courseEligibleForIicrcCecSubmission(course: {
  slug?: string | null;
  cecHours: unknown;
  iicrcDiscipline: string | null;
  shortDescription?: string | null;
  description?: string | null;
  meta?: unknown;
  durationHours?: number | null;
}): boolean {
  // Eligibility requires REGISTRY-APPROVED CEC hours only. A non-empty `iicrcDiscipline`
  // string is NOT IICRC approval and must never make a course submission-eligible on its own
  // (that was a fail-open path — GP-498). Auto-submit is separately fail-closed by config.
  const cec = resolveEffectiveCecHours(course);
  return cec !== null && cec > 0;
}
