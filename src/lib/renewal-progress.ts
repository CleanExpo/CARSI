import { formatCecHoursForDisplay } from '@/lib/cec-display';
import { RENEWAL_CEC_REQUIRED, type RenewalSummaryPayload } from '@/types/renewal';

/** What a learner renewal card shows for CEC progress (GP-655). */
export type RenewalProgress = {
  /** CECs counted: inside the renewal period when one is known, otherwise lifetime. */
  earned: number;
  target: number;
  /** True only when `earned` was counted inside the learner's IICRC renewal period. */
  inPeriod: boolean;
  /** Never true without a renewal period: a lifetime total cannot meet a 4-year target. */
  reached: boolean;
  /** 0–100 toward the target; 0 without a renewal period. */
  percent: number;
  status: string;
};

function formatExpiry(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Pure. Renewal progress comes from the cycle-aware renewal summary
 * (`/api/lms/gamification/me/renewal-summary`), which counts only completions inside the
 * RENEWAL_CYCLE_YEARS before the learner's renewal date. Without a renewal date (or without a
 * summary) the card shows the lifetime total, labelled as lifetime, and never says the target
 * is reached: a course finished seven years ago does not count toward this renewal.
 */
export function renewalProgress(
  summary: RenewalSummaryPayload | null | undefined,
  lifetimeFallback: number
): RenewalProgress {
  const target = summary?.cec_required ?? RENEWAL_CEC_REQUIRED;
  if (summary?.tracking_mode === 'cycle' && summary.renewal_expiry_date) {
    const earned = summary.cec_earned_in_cycle;
    const reached = earned >= target;
    const remaining = Math.max(0, target - earned);
    return {
      earned,
      target,
      inPeriod: true,
      reached,
      percent: Math.min(100, (earned / target) * 100),
      status: reached
        ? `Renewal target reached for the period ending ${formatExpiry(summary.renewal_expiry_date)}.`
        : `${formatCecHoursForDisplay(remaining) ?? remaining} CECs remaining in the period ending ${formatExpiry(summary.renewal_expiry_date)}. Unapproved courses add none.`,
    };
  }
  const earned = summary?.cec_earned_lifetime ?? lifetimeFallback;
  return {
    earned,
    target,
    inPeriod: false,
    reached: false,
    percent: 0,
    status:
      'Lifetime total. Add your IICRC renewal date to your profile to track your current renewal period.',
  };
}
