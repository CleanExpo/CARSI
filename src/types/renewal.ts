/**
 * IICRC renewal rule for standard technician certifications: "14 CECs (hours) every four years"
 * (iicrc.org/iicrcfaqs, read 20/10/2026). Master and Inspector certifications need 14 every two
 * years; the learner's level is not recorded yet, so the summary uses the standard window and the
 * cockpit says so (GP-655).
 */
export const RENEWAL_CEC_REQUIRED = 14;
export const RENEWAL_CYCLE_YEARS = 4;
/** Shown beside every learner renewal target, since the summary assumes the standard window. */
export const RENEWAL_RULE_NOTE = `IICRC rule: ${RENEWAL_CEC_REQUIRED} CECs every ${RENEWAL_CYCLE_YEARS} years. Master and Inspector certifications need ${RENEWAL_CEC_REQUIRED} every 2 years.`;

export interface RenewalCourseSuggestion {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  iicrc_discipline: string | null;
  cec_hours: number | null;
  thumbnail_url: string | null;
  reason: string;
}

export type RenewalTrackingMode = 'cycle' | 'lifetime_no_expiry';

export interface RenewalSummaryPayload {
  tracking_mode: RenewalTrackingMode;
  has_renewal_expiry: boolean;
  renewal_expiry_date: string | null;
  cycle_start: string | null;
  cycle_end: string | null;
  cec_required: number;
  cec_earned_in_cycle: number;
  cec_earned_lifetime: number;
  by_discipline: Record<string, number>;
  by_discipline_lifetime: Record<string, number>;
  days_until_expiry: number | null;
  renewal_urgent: boolean;
  iicrc_member_number: string | null;
  /** True when at least one completed course had no CEC hours in DB — a 1 CEC placeholder per IICRC-tagged course was used for this summary. */
  some_cecs_estimated: boolean;
  suggested_courses: RenewalCourseSuggestion[];
}
