/**
 * Stripe adapter for the RWR report (V5). Reads active subscriptions and the last 28 days of
 * paid course checkouts and shapes them into `RwrInputs`. Read-only: it only lists.
 *
 * Fails closed. Every refusal throws `RwrUnreadableError` and the report prints no figure:
 *  - pagination that does not finish within the page cap (a partial total would understate
 *    revenue and read as a downturn);
 *  - test-mode data (any subscription or checkout session with livemode !== true);
 *  - an active subscription with an unrecognised plan (org and coaching are the only known
 *    plans left out of the formula; anything else might be uncounted revenue);
 *  - a membership that is not one AUD yearly item, quantity 1, at the membership price;
 *  - a counted subscription (membership or Teams) that is not AUD, has an unreadable price, an
 *    interval this module cannot annualise, or an item list with more pages (subscription items
 *    paginate separately from the subscription list);
 *  - a paid course checkout in another currency or with no readable amount.
 */
import type Stripe from 'stripe';

import { subscriptionKind } from '@/lib/server/subscription-webhook';

import {
  annualiseUnitAmount,
  COURSE_SALES_WINDOW_DAYS,
  RWR_MEMBERSHIP_ANNUAL_CENTS,
  type RwrInputs,
  type SeatLine,
} from './rwr';

export class RwrUnreadableError extends Error {}

/** The two list calls the report needs — the real Stripe client satisfies this. */
export interface RwrStripeReader {
  subscriptions: {
    list(
      params: Stripe.SubscriptionListParams
    ): Promise<{ data: Stripe.Subscription[]; has_more: boolean }>;
  };
  checkout: {
    sessions: {
      list(
        params: Stripe.Checkout.SessionListParams
      ): Promise<{ data: Stripe.Checkout.Session[]; has_more: boolean }>;
    };
  };
}

export const RWR_PAGE_SIZE = 100;
export const RWR_MAX_PAGES = 50;

async function listAll<T extends { id: string }, P extends object>(
  list: (
    params: P & { limit: number; starting_after?: string }
  ) => Promise<{ data: T[]; has_more: boolean }>,
  params: P,
  what: string
): Promise<T[]> {
  const out: T[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < RWR_MAX_PAGES; page += 1) {
    const res = await list({
      ...params,
      limit: RWR_PAGE_SIZE,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    out.push(...res.data);
    if (!res.has_more) return out;
    const last = res.data[res.data.length - 1];
    if (!last)
      throw new RwrUnreadableError(`Stripe ${what} said more pages follow but returned none`);
    startingAfter = last.id;
  }
  throw new RwrUnreadableError(
    `Stripe ${what} did not finish within ${RWR_MAX_PAGES} pages; refusing a partial total`
  );
}

/** Live-mode data only: a test-mode object must never be read as the live GOAL.md metric. */
function requireLive(obj: { id: string; livemode?: boolean }, what: string): void {
  if (obj.livemode !== true) {
    throw new RwrUnreadableError(`${what} ${obj.id} is test-mode data; RWR reports live data only`);
  }
}

/**
 * Validate every price on a counted subscription and return its seat lines. Refuses a partial
 * item list (subscription items paginate separately from the subscription list), a non-AUD
 * subscription or price, an unreadable unit price and an interval that cannot be annualised.
 */
function readSubscriptionItems(sub: Stripe.Subscription, what: string): SeatLine[] {
  if ((sub.currency ?? '').toLowerCase() !== 'aud') {
    throw new RwrUnreadableError(`${what} ${sub.id} is not priced in AUD`);
  }
  const items = sub.items;
  if (!items || !Array.isArray(items.data) || items.data.length === 0) {
    throw new RwrUnreadableError(`${what} ${sub.id} has no readable items`);
  }
  if (items.has_more) {
    throw new RwrUnreadableError(`${what} ${sub.id} has more items than one page returned`);
  }
  return items.data.map((item) => {
    const price = item.price;
    const unit = price?.unit_amount;
    const recurring = price?.recurring;
    if (typeof unit !== 'number' || !recurring) {
      throw new RwrUnreadableError(`${what} ${sub.id} has an unreadable price`);
    }
    if ((price.currency ?? '').toLowerCase() !== 'aud') {
      throw new RwrUnreadableError(`${what} ${sub.id} is not priced in AUD`);
    }
    const annual = annualiseUnitAmount(unit, recurring.interval, recurring.interval_count ?? 1);
    if (annual === null) {
      throw new RwrUnreadableError(`${what} ${sub.id} has an unsupported billing interval`);
    }
    return { seats: item.quantity ?? 1, annualSeatPriceCents: annual };
  });
}

/**
 * A membership is counted at the fixed GOAL.md term, so Stripe must show exactly that product:
 * one AUD item, quantity 1, billed yearly (interval_count 1) at the membership price. A monthly
 * item, extra seats, extra items or another price is a configuration the formula does not
 * describe, so the report refuses rather than counting it as a $795 year.
 */
function requireYearlyMembershipItem(sub: Stripe.Subscription): void {
  readSubscriptionItems(sub, 'membership subscription'); // currency, readability, pagination
  const items = sub.items.data;
  const item = items[0];
  const recurring = item?.price?.recurring;
  const isYearlyMembership =
    items.length === 1 &&
    item.quantity === 1 &&
    recurring?.interval === 'year' &&
    (recurring.interval_count ?? 1) === 1 &&
    item.price.unit_amount === RWR_MEMBERSHIP_ANNUAL_CENTS;
  if (!isYearlyMembership) {
    throw new RwrUnreadableError(
      `membership subscription ${sub.id} is not a single yearly item at the GOAL.md membership price`
    );
  }
}

export type RwrCollection = {
  inputs: RwrInputs;
  /** Active subscriptions the GOAL.md formula does not count (org, coaching, unknown plans). */
  excludedSubscriptions: number;
  courseSales28d: number;
};

export async function collectRwrInputs(
  stripe: RwrStripeReader,
  now: Date = new Date()
): Promise<RwrCollection> {
  const subs = await listAll(
    (p) => stripe.subscriptions.list(p),
    { status: 'active' } as Stripe.SubscriptionListParams,
    'subscriptions'
  );

  let memberships = 0;
  let excludedSubscriptions = 0;
  const seatLines: SeatLine[] = [];
  for (const sub of subs) {
    requireLive(sub, 'subscription');
    if (sub.status !== 'active') continue;
    const kind = subscriptionKind(sub);
    if (kind === 'individual') {
      // Counted at the GOAL.md $795, but only once Stripe proves it is that product.
      requireYearlyMembershipItem(sub);
      memberships += 1;
    } else if (kind === 'team') {
      seatLines.push(...readSubscriptionItems(sub, 'Teams subscription'));
    } else if (kind === 'org' || kind === 'coaching') {
      // Known plans the GOAL.md formula deliberately leaves out; reported as a count.
      excludedSubscriptions += 1;
    } else {
      // An active subscription nobody can classify might be revenue the formula should count.
      throw new RwrUnreadableError(`active subscription ${sub.id} has an unrecognised plan`);
    }
  }

  const since = Math.floor(now.getTime() / 1000) - COURSE_SALES_WINDOW_DAYS * 86_400;
  const sessions = await listAll(
    (p) => stripe.checkout.sessions.list(p),
    { created: { gte: since }, status: 'complete' } as Stripe.Checkout.SessionListParams,
    'checkout sessions'
  );

  let courseSalesCents28d = 0;
  let courseSales28d = 0;
  for (const s of sessions) {
    requireLive(s, 'checkout session');
    if (s.mode !== 'payment' || s.payment_status !== 'paid') continue;
    const slug = s.metadata?.course_slug;
    if (typeof slug !== 'string' || !slug.trim()) continue;
    if ((s.currency ?? '').toLowerCase() !== 'aud') {
      throw new RwrUnreadableError(`course checkout ${s.id} is not in AUD`);
    }
    if (
      typeof s.amount_total !== 'number' ||
      !Number.isInteger(s.amount_total) ||
      s.amount_total < 0
    ) {
      throw new RwrUnreadableError(`course checkout ${s.id} has no readable amount`);
    }
    courseSalesCents28d += s.amount_total;
    courseSales28d += 1;
  }

  return {
    inputs: { memberships, seatLines, courseSalesCents28d },
    excludedSubscriptions,
    courseSales28d,
  };
}
