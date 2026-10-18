/**
 * Stripe adapter for the RWR report (V5). Reads active subscriptions and the course checkouts
 * PAID in the last 28 days (dated by Stripe's checkout payment events) and shapes them into
 * `RwrInputs`. Read-only: it only lists.
 *
 * Fails closed. Every refusal throws `RwrUnreadableError` and the report prints no figure:
 *  - pagination that does not finish within the page cap (a partial total would understate
 *    revenue and read as a downturn);
 *  - test-mode data (any subscription, payment event or checkout session with livemode !== true);
 *  - a payment event of an unexpected type, outside the window, or without a readable session;
 *  - a Teams item whose seat quantity is missing, fractional or not positive;
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
  events: {
    list(params: Stripe.EventListParams): Promise<{ data: Stripe.Event[]; has_more: boolean }>;
  };
}

/**
 * A course sale is dated by when it was PAID, not when its Checkout Session was created: a
 * session opened before the 28-day cutoff and paid after it is a sale inside the window. A
 * Checkout Session carries no payment timestamp, so the authoritative time is the Stripe event
 * that records the payment: `checkout.session.completed` (card and other instant methods) or
 * `checkout.session.async_payment_succeeded` (delayed methods such as BECS Direct Debit). The
 * event's `created` is the moment of payment; its `data.object` is the session at that moment.
 * Stripe keeps event history for 30 days, which covers the 28-day window.
 */
export const COURSE_PAYMENT_EVENT_TYPES = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
] as const;

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
    // Stripe allows a null quantity; a seat count nobody can read is not "one seat".
    const seats = item.quantity;
    if (typeof seats !== 'number' || !Number.isInteger(seats) || seats < 1) {
      throw new RwrUnreadableError(`${what} ${sub.id} has an unreadable seat quantity`);
    }
    return { seats, annualSeatPriceCents: annual };
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

  // The window is the last 28 days of PAYMENTS (see COURSE_PAYMENT_EVENT_TYPES).
  const since = Math.floor(now.getTime() / 1000) - COURSE_SALES_WINDOW_DAYS * 86_400;
  const paymentEvents = await listAll(
    (p) => stripe.events.list(p),
    { types: [...COURSE_PAYMENT_EVENT_TYPES], created: { gte: since } } as Stripe.EventListParams,
    'checkout payment events'
  );

  let courseSalesCents28d = 0;
  let courseSales28d = 0;
  const counted = new Set<string>();
  for (const event of paymentEvents) {
    requireLive(event, 'payment event');
    if (!(COURSE_PAYMENT_EVENT_TYPES as readonly string[]).includes(event.type)) {
      throw new RwrUnreadableError(`payment event ${event.id} has an unexpected type`);
    }
    if (typeof event.created !== 'number' || event.created < since) {
      throw new RwrUnreadableError(`payment event ${event.id} falls outside the requested window`);
    }
    const s = event.data?.object as Stripe.Checkout.Session | undefined;
    if (!s || typeof s.id !== 'string') {
      throw new RwrUnreadableError(
        `payment event ${event.id} carries no readable checkout session`
      );
    }
    requireLive(s, 'checkout session');
    // A delayed-payment session appears twice (completed unpaid, then paid); count it once, paid.
    if (counted.has(s.id)) continue;
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
    counted.add(s.id);
    courseSalesCents28d += s.amount_total;
    courseSales28d += 1;
  }

  return {
    inputs: { memberships, seatLines, courseSalesCents28d },
    excludedSubscriptions,
    courseSales28d,
  };
}
