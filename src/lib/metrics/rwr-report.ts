/**
 * `npm run report:rwr` (V5). Phill runs it with STRIPE_SECRET_KEY in his own shell; agents never
 * handle the key.
 *
 * Exit codes: 0 = figure printed (the only path that prints an amount); 2 = no figure, with the
 * blocker named. Live mode only: a test-mode key or test-mode object is refused. It never prints "$0"
 * when it could not look: "$0 per week" says nothing sold, which is a different and much worse
 * statement than "I could not read Stripe".
 */
import { normalizeStripeSecretKey } from '@/lib/api/stripe';

import { computeRwr, formatAud } from './rwr';
import { collectRwrInputs, RwrUnreadableError, type RwrStripeReader } from './rwr-stripe';

export type RwrReportDeps = {
  env: Record<string, string | undefined>;
  json: boolean;
  /** Builds the read-only Stripe client from the key. */
  createStripe: (key: string) => RwrStripeReader;
  now?: Date;
  out: (line: string) => void;
  err: (line: string) => void;
};

/**
 * Every exit-2 message passes through here, so no failure path can print an amount, whatever
 * text an upstream error carried. Anything money-shaped (a currency sign or code next to a
 * number) is removed before it is printed.
 */
const MONEY_SHAPED =
  /(?:[A-Z]{0,3}[$€£¥]\s?\d[\d,]*(?:\.\d+)?)|(?:\b(?:AUD|USD|NZD|GBP|EUR)\s?\d[\d,]*(?:\.\d+)?)|(?:\d[\d,]*(?:\.\d+)?\s?(?:AUD|USD|NZD|GBP|EUR)\b)/gi;

export function withoutAmounts(text: string): string {
  return text.replace(MONEY_SHAPED, '[amount removed]');
}

function blocked(deps: RwrReportDeps, reason: string): number {
  const safe = withoutAmounts(reason);
  if (deps.json) deps.out(JSON.stringify({ status: 'blocked', reason: safe }));
  else deps.err(`RWR not reported: ${safe}`);
  return 2;
}

/**
 * A stable, non-monetary reason. Our own refusals (`RwrUnreadableError`) are worded here and
 * carry no amounts; anything else (a Stripe SDK or network error) is reduced to its type and
 * HTTP status, never its free-text message.
 */
function describe(error: unknown): string {
  if (error instanceof RwrUnreadableError) return error.message;
  const e = (error ?? {}) as { type?: unknown; statusCode?: unknown; name?: unknown };
  const type = typeof e.type === 'string' ? e.type : typeof e.name === 'string' ? e.name : 'Error';
  const status = typeof e.statusCode === 'number' ? `, HTTP ${e.statusCode}` : '';
  return `Stripe request failed: ${type.replace(/[^A-Za-z]/g, '')}${status}`;
}

/** Restricted or secret key issued for Stripe test mode. */
function isTestModeKey(key: string): boolean {
  return /^(sk|rk)_test_/.test(key);
}

export async function runRwrReport(deps: RwrReportDeps): Promise<number> {
  const key = normalizeStripeSecretKey(deps.env.STRIPE_SECRET_KEY ?? '');
  if (!key) {
    return blocked(deps, 'STRIPE_SECRET_KEY is not set, so Stripe cannot be read.');
  }
  if (isTestModeKey(key)) {
    return blocked(
      deps,
      'STRIPE_SECRET_KEY is a test-mode key; RWR reports live Stripe data only.'
    );
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
