/**
 * `npm run report:rwr` (V5). Phill runs it with STRIPE_SECRET_KEY in his own shell; agents never
 * handle the key.
 *
 * Exit codes: 0 = figure printed; 2 = no figure, with the blocker named. It never prints "$0"
 * when it could not look: "$0 per week" says nothing sold, which is a different and much worse
 * statement than "I could not read Stripe".
 */
import { normalizeStripeSecretKey } from '@/lib/api/stripe';

import { computeRwr, formatAud } from './rwr';
import { collectRwrInputs, type RwrStripeReader } from './rwr-stripe';

export type RwrReportDeps = {
  env: Record<string, string | undefined>;
  json: boolean;
  /** Builds the read-only Stripe client from the key. */
  createStripe: (key: string) => RwrStripeReader;
  now?: Date;
  out: (line: string) => void;
  err: (line: string) => void;
};

function blocked(deps: RwrReportDeps, reason: string): number {
  if (deps.json) deps.out(JSON.stringify({ status: 'blocked', reason }));
  else deps.err(`RWR not reported: ${reason}`);
  return 2;
}

/** Keep a Stripe error readable without echoing anything key-shaped back. */
function describe(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/\b(sk|rk)_[A-Za-z0-9_]+/g, '[redacted]').slice(0, 300);
}

export async function runRwrReport(deps: RwrReportDeps): Promise<number> {
  const key = normalizeStripeSecretKey(deps.env.STRIPE_SECRET_KEY ?? '');
  if (!key) {
    return blocked(deps, 'STRIPE_SECRET_KEY is not set, so Stripe cannot be read.');
  }

  let collected;
  let r;
  try {
    collected = await collectRwrInputs(deps.createStripe(key), deps.now ?? new Date());
    r = computeRwr(collected.inputs);
  } catch (error) {
    return blocked(deps, `Stripe could not be read (${describe(error)}).`);
  }

  if (deps.json) {
    deps.out(
      JSON.stringify({
        status: 'ok',
        rwr_weekly_cents: r.rwrWeeklyCents,
        recurring_weekly_cents: r.recurringWeeklyCents,
        course_sales_weekly_cents: r.courseSalesWeeklyCents,
        course_sales_28d_cents: r.courseSalesCents28d,
        course_sales_28d: collected.courseSales28d,
        memberships: r.memberships,
        seats: r.seats,
        excluded_subscriptions: collected.excludedSubscriptions,
      })
    );
    return 0;
  }
  deps.out(`RWR: ${formatAud(r.rwrWeeklyCents)} per week`);
  deps.out(
    `  Recurring: ${r.memberships} memberships x $795 + ${r.seats} seats = ` +
      `${formatAud(r.membershipAnnualCents + r.seatAnnualCents)} a year, ÷ 52 = ${formatAud(r.recurringWeeklyCents)}`
  );
  deps.out(
    `  Course sales: ${collected.courseSales28d} in the last 28 days = ` +
      `${formatAud(r.courseSalesCents28d)}, ÷ 4 = ${formatAud(r.courseSalesWeeklyCents)}`
  );
  if (collected.excludedSubscriptions > 0) {
    deps.out(
      `  Not in the formula: ${collected.excludedSubscriptions} other active subscriptions (org, coaching or unknown plans)`
    );
  }
  return 0;
}
