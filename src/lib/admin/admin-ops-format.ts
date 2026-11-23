/** Browser-safe. Do not import Prisma or admin-user-progress from this file. */

export type AdminOpsPeriod = 'this_month' | 'last_month' | 'this_year' | 'all';

export function formatAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/**
 * GP-763. Shown wherever a revenue figure would be: the database keeps no amount paid per
 * enrolment, and a course's price today is not what an earlier learner paid.
 */
export const REVENUE_PRICE_UNKNOWN_LABEL = 'Price at purchase unknown';

/** A revenue amount, or the unknown label when it is null (never a price-derived guess). */
export function formatRevenueAud(amount: number | null): string {
  return amount === null ? REVENUE_PRICE_UNKNOWN_LABEL : formatAud(amount);
}

/**
 * GP-764. The revenue line for a period: the full figure when every paid checkout in it has a
 * recorded amount; otherwise the recorded dollars beside the count still unknown, so a partial
 * sum never reads as the whole; the unknown label when nothing is recorded.
 */
export function formatRevenueSummary(k: {
  revenueAud: number | null;
  revenueRecordedAud: number;
  paidPriceUnknown: number;
}): string {
  if (k.revenueAud !== null) return formatAud(k.revenueAud);
  if (k.revenueRecordedAud <= 0) return REVENUE_PRICE_UNKNOWN_LABEL;
  const n = k.paidPriceUnknown;
  return `${formatAud(k.revenueRecordedAud)} recorded, plus ${n} paid ${n === 1 ? 'checkout' : 'checkouts'} with price at purchase unknown`;
}

/** Month-on-month change. Null when the prior window is empty and this one is not. */
export function momDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatSignedPct(pct: number): string {
  if (pct === 0) return 'flat vs last month';
  return `${pct > 0 ? '+' : ''}${pct}% vs last month`;
}
