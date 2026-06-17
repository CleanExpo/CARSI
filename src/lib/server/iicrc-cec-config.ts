/** IICRC CEC auto-submission configuration (course completion → renewals@iicrcnet.org). */

export const DEFAULT_IICRC_CEC_SUBMISSION_EMAIL = 'renewals@iicrcnet.org';

export function getIicrcCecSubmissionEmail(): string {
  const v = process.env.IICRC_CEC_SUBMISSION_EMAIL?.trim();
  return v || DEFAULT_IICRC_CEC_SUBMISSION_EMAIL;
}

/** When false, submissions are recorded as `skipped` with reason `auto_submit_disabled`. */
export function isIicrcCecAutoSubmitEnabled(): boolean {
  const v = process.env.IICRC_CEC_AUTO_SUBMIT?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return true;
}

export function courseEligibleForIicrcCecSubmission(course: {
  cecHours: unknown;
  iicrcDiscipline: string | null;
}): boolean {
  const cec = toFiniteNumber(course.cecHours);
  if (cec !== null && cec > 0) return true;
  const disc = course.iicrcDiscipline?.trim();
  return Boolean(disc && disc !== '—' && disc !== '-');
}

function toFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
