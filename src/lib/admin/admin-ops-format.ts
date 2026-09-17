/** Browser-safe. Do not import Prisma or admin-user-progress from this file. */

export type AdminOpsPeriod = 'this_month' | 'last_month' | 'this_year' | 'all';

export function formatAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
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
