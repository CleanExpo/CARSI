export const RENEWAL_CEC_REQUIRED = 8;

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
