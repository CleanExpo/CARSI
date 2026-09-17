/**
 * Pre-renewal reminder for the yearly membership (E1) and Teams plans (E2).
 *
 * Australian Consumer Law practice requires a subscriber to be told before an
 * automatic renewal charges them. Stripe emits `invoice.upcoming` ahead of each
 * renewal (the lead time is a Stripe Billing dashboard setting — see
 * docs/runbooks/rana-stripe-connection.md). This module turns that event into
 * one branded email per renewal.
 *
 * Honesty rules:
 *  - Amount, currency and renewal date come ONLY from the upcoming invoice. If
 *    any is missing (or the currency is not AUD) nothing is sent and the reason
 *    is logged. Nothing is inferred from the catalogue price.
 *  - An email that did not send THROWS. The webhook route's existing failure
 *    path then reports it (Sentry) and returns 5xx so Stripe retries.
 *  - Idempotency: the route already dedupes by Stripe event id. On top of that
 *    a sent reminder is recorded as an `LmsNotification` (unique `dedupeKey` =
 *    subscription + renewal date), so a second event for the same renewal is a
 *    no-op. The record is written AFTER the email sends: a crash between the two
 *    can at worst repeat a reminder, never silently drop one.
 */

import type Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/server/app-url';
import { sendEmail } from '@/lib/server/email';
import { renderRenewalReminderEmail } from '@/lib/server/email-templates';
import { captureServerError } from '@/lib/server/sentry';
import { readInvoiceEmail } from '@/lib/server/stripe-subscription-map';
import { resolveUserIdForStripeSubscription } from '@/lib/server/subscription-store';
import { resolveTeamIdForStripeSubscription } from '@/lib/server/team-subscription-store';

export const RENEWAL_REMINDER_TYPE = 'renewal_reminder';

const SUPPORT_EMAIL = 'support@carsi.com.au';
const AU_TIME_ZONE = 'Australia/Sydney';

export type RenewalReminderSkipReason =
  | 'missing_amount'
  | 'missing_renewal_date'
  | 'non_aud_currency'
  | 'zero_amount'
  | 'unsupported_plan'
  | 'not_renewing'
  | 'recipient_unresolved'
  | 'already_sent';

export type RenewalReminderOutcome =
  | { sent: true; dedupeKey: string }
  | { sent: false; reason: RenewalReminderSkipReason };

type RenewalFacts = { amountCents: number; renewalAt: Date };

/** Pure: read amount + renewal date from an upcoming invoice, or say what is missing. */
export function readRenewalFacts(
  invoice: Stripe.Invoice,
): { ok: true; facts: RenewalFacts } | { ok: false; reason: RenewalReminderSkipReason } {
  const raw = invoice as unknown as {
    amount_due?: unknown;
    currency?: unknown;
    next_payment_attempt?: unknown;
  };
  const amount = raw.amount_due;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0) {
    return { ok: false, reason: 'missing_amount' };
  }
  if (typeof raw.currency !== 'string' || raw.currency.toLowerCase() !== 'aud') {
    return { ok: false, reason: 'non_aud_currency' };
  }
  const at = raw.next_payment_attempt;
  if (typeof at !== 'number' || !Number.isFinite(at) || at <= 0) {
    return { ok: false, reason: 'missing_renewal_date' };
  }
  if (amount === 0) {
    // Nothing will be charged (credit/coupon) — no charge to warn about.
    return { ok: false, reason: 'zero_amount' };
  }
  return { ok: true, facts: { amountCents: amount, renewalAt: new Date(at * 1000) } };
}

/** Pure: "A$2,499.00 incl. GST" (matches the site's "incl. GST" wording). */
export function formatRenewalAmount(cents: number): string {
  const formatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  return `A${formatted} incl. GST`;
}

/** Pure: "17 October 2026" in Australian eastern time. */
export function formatRenewalDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    timeZone: AU_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Pure: idempotency key — one reminder per subscription per renewal date. */
export function renewalReminderDedupeKey(subscriptionId: string, renewalAt: Date): string {
  const day = renewalAt.toLocaleDateString('en-CA', { timeZone: AU_TIME_ZONE }); // YYYY-MM-DD
  return `${RENEWAL_REMINDER_TYPE}:${subscriptionId}:${day}`;
}

const TEAM_PLAN_LABELS: Record<string, string> = {
  starter: 'CARSI Teams Starter',
  growth: 'CARSI Teams Growth',
  full_library: 'CARSI Teams Full Library',
};

function teamPlanLabel(plan: string | undefined): string {
  const key = (plan ?? '').trim().toLowerCase();
  return TEAM_PLAN_LABELS[key] ?? 'CARSI Teams plan';
}

type Recipient = {
  userId: string;
  to: string;
  name: string;
  planLabel: string;
  teamName?: string;
  manageUrl: string;
  cancelInstruction: string;
};

async function resolveRecipient(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription,
  kind: 'individual' | 'team',
  origin: string,
): Promise<Recipient | null> {
  // The invoice's customer email is the person Stripe bills; the CARSI account
  // email is the fallback.
  const billingEmail = readInvoiceEmail(invoice);

  let userId: string | null;
  let teamName: string | undefined;
  if (kind === 'team') {
    const teamId = await resolveTeamIdForStripeSubscription(subscription);
    const team = teamId
      ? await prisma.lmsTeam.findUnique({
          where: { id: teamId },
          select: { ownerId: true, name: true },
        })
      : null;
    userId = team?.ownerId ?? null;
    teamName = team?.name?.trim() || undefined;
  } else {
    userId = await resolveUserIdForStripeSubscription(subscription, billingEmail);
  }
  if (!userId) return null;

  const user = await prisma.lmsUser.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });
  const to = billingEmail ?? user?.email?.trim().toLowerCase() ?? null;
  if (!to) return null;

  const name = user?.fullName?.trim() || to.split('@')[0];
  if (kind === 'team') {
    // There is no self-serve billing portal for Teams owners yet (the portal
    // route only reads individual memberships), so cancellation is by request.
    return {
      userId,
      to,
      name,
      planLabel: teamPlanLabel(subscription.metadata?.plan),
      teamName,
      manageUrl: `${origin}/dashboard/team`,
      cancelInstruction: `To cancel, reply to this email or write to ${SUPPORT_EMAIL} and we will set your plan to end at the close of the current period.`,
    };
  }
  return {
    userId,
    to,
    name,
    planLabel: 'CARSI Yearly Membership',
    manageUrl: `${origin}/subscribe`,
    cancelInstruction:
      'To cancel, sign in, open your membership page and choose "Manage billing & payment method".',
  };
}

function skip(
  subscriptionId: string,
  reason: RenewalReminderSkipReason,
): RenewalReminderOutcome {
  console.warn('[renewal-reminder] not sent', { subscriptionId, reason });
  return { sent: false, reason };
}

/**
 * Send the pre-renewal reminder for one `invoice.upcoming` event. The caller has
 * already fetched the authoritative subscription and classified its plan.
 * Returns a skip outcome for terminal conditions; THROWS when the email fails.
 */
export async function sendUpcomingRenewalReminder(params: {
  invoice: Stripe.Invoice;
  subscription: Stripe.Subscription;
  kind: 'individual' | 'team' | 'org' | 'unknown';
}): Promise<RenewalReminderOutcome> {
  const { invoice, subscription, kind } = params;
  const subscriptionId = subscription.id;

  const read = readRenewalFacts(invoice);
  if (!read.ok) return skip(subscriptionId, read.reason);
  const { amountCents, renewalAt } = read.facts;

  if (kind !== 'individual' && kind !== 'team') return skip(subscriptionId, 'unsupported_plan');

  const cancelAtPeriodEnd = Boolean(
    (subscription as unknown as { cancel_at_period_end?: boolean }).cancel_at_period_end,
  );
  if (
    cancelAtPeriodEnd ||
    subscription.status === 'canceled' ||
    subscription.status === 'incomplete_expired'
  ) {
    return skip(subscriptionId, 'not_renewing');
  }

  const dedupeKey = renewalReminderDedupeKey(subscriptionId, renewalAt);
  const existing = await prisma.lmsNotification.findUnique({
    where: { dedupeKey },
    select: { id: true },
  });
  if (existing) return skip(subscriptionId, 'already_sent');

  const origin = getAppOrigin();
  const recipient = await resolveRecipient(invoice, subscription, kind, origin);
  if (!recipient) return skip(subscriptionId, 'recipient_unresolved');

  const renewalDateLabel = formatRenewalDate(renewalAt);
  const amountLabel = formatRenewalAmount(amountCents);
  const { html, text } = renderRenewalReminderEmail({
    appOrigin: origin,
    name: recipient.name,
    planLabel: recipient.planLabel,
    teamName: recipient.teamName,
    renewalDateLabel,
    amountLabel,
    manageUrl: recipient.manageUrl,
    cancelInstruction: recipient.cancelInstruction,
  });
  const subject = `Your ${recipient.planLabel} renews on ${renewalDateLabel}`;

  const result = await sendEmail({
    to: recipient.to,
    subject,
    html,
    text,
    replyTo: SUPPORT_EMAIL,
  });
  if (!result.sent) {
    console.error('[renewal-reminder] email not sent', {
      subscriptionId,
      reason: result.reason,
    });
    throw new Error(`renewal reminder email not sent (${result.reason ?? 'unknown'})`);
  }

  try {
    await prisma.lmsNotification.create({
      data: {
        userId: recipient.userId,
        type: RENEWAL_REMINDER_TYPE,
        title: subject,
        body: `Your ${recipient.planLabel} renews automatically on ${renewalDateLabel} for ${amountLabel}.`,
        linkUrl: recipient.manageUrl,
        dedupeKey,
      },
      select: { id: true },
    });
  } catch (error) {
    // The email DID send, so do not throw: a 5xx would make Stripe retry and
    // send it again. Surface the lost record loudly instead.
    console.error('[renewal-reminder] sent but could not record the reminder', {
      subscriptionId,
      dedupeKey,
    });
    void captureServerError(error, {
      route: '/api/lms/webhooks/stripe',
      tags: { eventType: 'invoice.upcoming', stage: 'record_renewal_reminder' },
    });
  }

  console.info('[renewal-reminder] sent', { subscriptionId, dedupeKey, messageId: result.messageId });
  return { sent: true, dedupeKey };
}
