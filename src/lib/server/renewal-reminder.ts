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
 *  - Idempotency: the route already dedupes by Stripe event id. On top of that,
 *    each renewal is CLAIMED before sending by inserting an `LmsNotification`
 *    whose `dedupeKey` (subscription + renewal date) is unique in the database.
 *    The claim is saved as `renewal_reminder_pending` and becomes
 *    `renewal_reminder` only once the email has gone (GP-595). Only the delivery
 *    that holds the claim sends, so concurrent deliveries with different event
 *    ids send once. A failed send removes its own claim and throws so Stripe's
 *    retry can send. A delivery that finds a pending claim younger than
 *    RENEWAL_REMINDER_STALE_CLAIM_MS throws (another delivery may be sending),
 *    so Stripe retries later. A pending claim older than that belongs to an
 *    attempt that died (process killed, or its release failed); the next
 *    delivery takes it over atomically and sends. Accepted failure direction: a
 *    process killed after the email went out but before the claim was marked
 *    sent leads to a second, identical reminder, never to none.
 */

import type Stripe from 'stripe';

import { formatAudCents, gstFromGstInclusiveCents } from '@/lib/billing/tax-invoice';
import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/server/app-url';
import { sendEmail } from '@/lib/server/email';
import {
  renderRenewalReminderEmail,
  type RenewalYearRecapView,
} from '@/lib/server/email-templates';
import { getRenewalYearRecapForStudent } from '@/lib/server/renewal-summary';
import { captureServerError } from '@/lib/server/sentry';
import { readInvoiceEmail } from '@/lib/server/stripe-subscription-map';
import { resolveUserIdForStripeSubscription } from '@/lib/server/subscription-store';
import { resolveTeamIdForStripeSubscription } from '@/lib/server/team-subscription-store';

export const RENEWAL_REMINDER_TYPE = 'renewal_reminder';
/** A claim whose email has not been confirmed as sent yet (GP-595). */
export const RENEWAL_REMINDER_PENDING_TYPE = 'renewal_reminder_pending';
/**
 * How old a pending claim must be before another delivery may take it over. A live
 * attempt finishes well inside this: the year recap is capped at YEAR_RECAP_TIMEOUT_MS
 * (3 s) and the email send at 15 s (sendEmail's own timeout).
 */
export const RENEWAL_REMINDER_STALE_CLAIM_MS = 5 * 60 * 1000;

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
  { sent: true; dedupeKey: string } | { sent: false; reason: RenewalReminderSkipReason };

type RenewalFacts = { amountCents: number; renewalAt: Date };

/** Pure: read amount + renewal date from an upcoming invoice, or say what is missing. */
export function readRenewalFacts(
  invoice: Stripe.Invoice
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

/**
 * Pure: the GST inside a GST-inclusive renewal amount, "A$117.73" for A$1,295.00. GST is a
 * fixed 10% line (ruling 22/11/2026): total / 11 from the one tax-invoice helper.
 */
export function formatRenewalGst(cents: number): string {
  return `A${formatAudCents(gstFromGstInclusiveCents(cents))}`;
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
  /**
   * True only when the email goes to the address that owns the learner's CARSI account
   * (trimmed, lower-cased, exact match). The billing email on the invoice can be someone else
   * (an employer, a bookkeeper), and the year recap is the learner's course history.
   */
  deliversToAccountEmail: boolean;
};

/** Trimmed and lower-cased, so a stored "  Casey@Example.com " still matches its owner. */
function normaliseEmail(email: string | null | undefined): string | null {
  return email?.trim().toLowerCase() || null;
}

async function resolveRecipient(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription,
  kind: 'individual' | 'team',
  origin: string
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
  const accountEmail = normaliseEmail(user?.email);
  const to = normaliseEmail(billingEmail) ?? accountEmail;
  if (!to) return null;
  const deliversToAccountEmail = accountEmail !== null && to === accountEmail;

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
      deliversToAccountEmail,
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
    deliversToAccountEmail,
  };
}

/** Longest the optional recap may hold up the required renewal notice. */
export const YEAR_RECAP_TIMEOUT_MS = 3_000;

/**
 * The member's "your year with CARSI" recap. Best-effort: a failed or slow read sends the
 * reminder without it, because the reminder is the legally expected notice and the recap is
 * not. The read is raced against a hard deadline so a stalled query can never stall the send.
 */
async function loadYearRecap(userId: string, origin: string): Promise<RenewalYearRecapView | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), YEAR_RECAP_TIMEOUT_MS);
    });
    const recap = await Promise.race([getRenewalYearRecapForStudent(userId), deadline]);
    if (recap === 'timeout') {
      console.warn('[renewal-reminder] year recap timed out; sending without it', { userId });
      return null;
    }
    if (!recap) return null;
    return {
      coursesCompleted: recap.coursesCompleted,
      certificatesIssued: recap.certificatesIssued,
      approvedCecHours: recap.approvedCecHours,
      nextCourses: recap.suggestedCourses.map((c) => ({
        title: c.title,
        url: `${origin}/courses/${encodeURIComponent(c.slug)}`,
      })),
    };
  } catch (error) {
    console.warn('[renewal-reminder] year recap unavailable; sending without it', {
      userId,
      error,
    });
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Remove this attempt's own claim after a failed send so Stripe's retry can send. Only a
 * still-pending row carrying this attempt's claim time is removed, never a sent reminder or
 * a claim another delivery has taken over. If the removal fails the claim stays; a
 * redelivery takes it over once it is older than RENEWAL_REMINDER_STALE_CLAIM_MS, so the
 * failure is reported but does not lose the reminder. The caller still throws.
 */
async function releaseClaim(
  subscriptionId: string,
  dedupeKey: string,
  claimedAt: Date
): Promise<void> {
  try {
    await prisma.lmsNotification.deleteMany({
      where: { dedupeKey, type: RENEWAL_REMINDER_PENDING_TYPE, createdAt: claimedAt },
    });
  } catch (error) {
    console.error(
      '[renewal-reminder] could not release claim after failed send; a redelivery takes it over once stale',
      { subscriptionId, dedupeKey }
    );
    void captureServerError(error, {
      route: '/api/lms/webhooks/stripe',
      tags: { eventType: 'invoice.upcoming', stage: 'release_renewal_reminder_claim' },
      extra: { dedupeKey },
    });
  }
}

/**
 * Mark this attempt's claim as a sent reminder. The email has already gone, so a failure
 * here is reported and the send still counts: the worst case is one duplicate reminder
 * after the stale window, never a lost one.
 */
async function confirmClaim(
  subscriptionId: string,
  dedupeKey: string,
  claimedAt: Date
): Promise<void> {
  try {
    const confirmed = await prisma.lmsNotification.updateMany({
      where: { dedupeKey, type: RENEWAL_REMINDER_PENDING_TYPE, createdAt: claimedAt },
      data: { type: RENEWAL_REMINDER_TYPE },
    });
    if (confirmed.count !== 1) {
      console.error("[renewal-reminder] sent, but the claim was no longer this attempt's", {
        subscriptionId,
        dedupeKey,
      });
    }
  } catch (error) {
    console.error('[renewal-reminder] sent, but could not mark the claim sent', {
      subscriptionId,
      dedupeKey,
    });
    void captureServerError(error, {
      route: '/api/lms/webhooks/stripe',
      tags: { eventType: 'invoice.upcoming', stage: 'confirm_renewal_reminder_claim' },
      extra: { dedupeKey },
    });
  }
}

type ClaimData = { userId: string; title: string; body: string; linkUrl: string };

/**
 * Take the right to send this renewal's reminder. Returns 'claimed' (this attempt sends),
 * or 'already_sent'. THROWS while another delivery may still be sending, so the route
 * answers 5xx and Stripe redelivers later.
 */
async function claimRenewal(
  dedupeKey: string,
  data: ClaimData,
  claimedAt: Date
): Promise<'claimed' | 'already_sent'> {
  try {
    await prisma.lmsNotification.create({
      data: { ...data, type: RENEWAL_REMINDER_PENDING_TYPE, dedupeKey, createdAt: claimedAt },
      select: { id: true },
    });
    return 'claimed';
  } catch (error) {
    if (!isUniqueViolation(error)) throw error; // transient: 5xx, Stripe retries, nothing sent
  }

  // A record exists. Take it over only if it is a pending claim older than the stale
  // window (compare-and-set: one delivery can win).
  const staleBefore = new Date(claimedAt.getTime() - RENEWAL_REMINDER_STALE_CLAIM_MS);
  const takenOver = await prisma.lmsNotification.updateMany({
    where: { dedupeKey, type: RENEWAL_REMINDER_PENDING_TYPE, createdAt: { lt: staleBefore } },
    data: { ...data, createdAt: claimedAt },
  });
  if (takenOver.count === 1) {
    console.warn('[renewal-reminder] took over a claim left by an earlier attempt', {
      dedupeKey,
    });
    return 'claimed';
  }

  const current = await prisma.lmsNotification.findUnique({
    where: { dedupeKey },
    select: { type: true },
  });
  if (current && current.type !== RENEWAL_REMINDER_PENDING_TYPE) return 'already_sent';
  throw new Error(
    'renewal reminder is being sent by another delivery (or its claim was just released); retry later'
  );
}

function skip(subscriptionId: string, reason: RenewalReminderSkipReason): RenewalReminderOutcome {
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
  kind: 'individual' | 'team' | 'org' | 'coaching' | 'unknown';
}): Promise<RenewalReminderOutcome> {
  const { invoice, subscription, kind } = params;
  const subscriptionId = subscription.id;

  const read = readRenewalFacts(invoice);
  if (!read.ok) return skip(subscriptionId, read.reason);
  const { amountCents, renewalAt } = read.facts;

  if (kind !== 'individual' && kind !== 'team') return skip(subscriptionId, 'unsupported_plan');

  const cancelAtPeriodEnd = Boolean(
    (subscription as unknown as { cancel_at_period_end?: boolean }).cancel_at_period_end
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
    select: { type: true },
  });
  // Only a sent reminder ends here; a pending claim is judged by claimRenewal below.
  if (existing && existing.type !== RENEWAL_REMINDER_PENDING_TYPE) {
    return skip(subscriptionId, 'already_sent');
  }

  const origin = getAppOrigin();
  const recipient = await resolveRecipient(invoice, subscription, kind, origin);
  if (!recipient) return skip(subscriptionId, 'recipient_unresolved');

  const renewalDateLabel = formatRenewalDate(renewalAt);
  const amountLabel = formatRenewalAmount(amountCents);
  const gstLabel = formatRenewalGst(amountCents);
  const yearRecap =
    kind === 'individual' && recipient.deliversToAccountEmail
      ? await loadYearRecap(recipient.userId, origin)
      : null;
  const { html, text } = renderRenewalReminderEmail({
    appOrigin: origin,
    name: recipient.name,
    planLabel: recipient.planLabel,
    teamName: recipient.teamName,
    renewalDateLabel,
    amountLabel,
    gstLabel,
    manageUrl: recipient.manageUrl,
    cancelInstruction: recipient.cancelInstruction,
    yearRecap,
  });
  const subject = `Your ${recipient.planLabel} renews on ${renewalDateLabel}`;

  // Claim before send (compare-and-set on the unique dedupe_key). Only the
  // delivery holding the claim may send. The claim time identifies this attempt's
  // claim when it is later confirmed or released.
  const claimedAt = new Date();
  const claim = await claimRenewal(
    dedupeKey,
    {
      userId: recipient.userId,
      title: subject,
      body: `Your ${recipient.planLabel} renews automatically on ${renewalDateLabel} for ${amountLabel}.`,
      linkUrl: recipient.manageUrl,
    },
    claimedAt
  );
  if (claim === 'already_sent') return skip(subscriptionId, 'already_sent');

  let result: Awaited<ReturnType<typeof sendEmail>>;
  try {
    result = await sendEmail({
      to: recipient.to,
      subject,
      html,
      text,
      replyTo: SUPPORT_EMAIL,
    });
  } catch (error) {
    result = { sent: false, reason: 'send_failed' };
    console.error('[renewal-reminder] email send threw', { subscriptionId, error });
  }
  if (!result.sent) {
    console.error('[renewal-reminder] email not sent', {
      subscriptionId,
      reason: result.reason,
    });
    await releaseClaim(subscriptionId, dedupeKey, claimedAt);
    throw new Error(`renewal reminder email not sent (${result.reason ?? 'unknown'})`);
  }

  await confirmClaim(subscriptionId, dedupeKey, claimedAt);
  console.info('[renewal-reminder] sent', {
    subscriptionId,
    dedupeKey,
    messageId: result.messageId,
  });
  return { sent: true, dedupeKey };
}
