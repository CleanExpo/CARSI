/**
 * Abandoned-checkout recovery for per-course and membership Stripe Checkout sessions.
 *
 * Ships DARK behind `CHECKOUT_RECOVERY_ENABLED` (absent/off = today's behaviour exactly):
 * - off: no `after_expiration` on new sessions, and `checkout.session.expired` sends nothing.
 * - on:  new sessions ask Stripe for a recovery URL, and an expired CARSI session with that
 *        URL and a buyer email gets one recovery email (users who opted out of non-essential
 *        email get none).
 * Rollback = set the flag off.
 *
 * DELIVERY GUARANTEE: at most one recovery email per Checkout Session, and a transient send
 * failure is retried. The webhook's event claim alone cannot give this: a different event id for
 * the same session, or a stale event claim reclaimed after a crash, would send again. So each send
 * first takes an atomic per-SESSION claim row (see `recoverySendLedger`), marked processed only
 * after the provider accepts the message. A failed send releases the row and reports a transient
 * outcome, and the webhook then releases its event claim and returns 5xx so Stripe redelivers.
 * The mail provider has no idempotency key, so a crash between "provider accepted" and "row
 * marked" is ambiguous; a stale unmarked row is therefore treated as possibly sent and never
 * resent (at-most-once wins for a non-essential email).
 */
import type Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
import { STALE_CLAIM_MS } from '@/lib/server/stripe-webhook-idempotency';
import { sendCheckoutRecoveryEmail } from '@/lib/server/transactional-email';

function envTrue(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** True when abandoned-checkout recovery is switched on. */
export function checkoutRecoveryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envTrue(env.CHECKOUT_RECOVERY_ENABLED);
}

/**
 * Extra Checkout Session params for recovery. Empty when the flag is off, so the session a
 * buyer gets is unchanged. Recovered sessions never get promotion codes added.
 */
export function checkoutRecoveryParams(
  env: NodeJS.ProcessEnv = process.env
): Pick<Stripe.Checkout.SessionCreateParams, 'after_expiration'> {
  if (!checkoutRecoveryEnabled(env)) return {};
  return { after_expiration: { recovery: { enabled: true, allow_promotion_codes: false } } };
}

/** Metadata `source` values of the sessions this module recovers. */
export const RECOVERABLE_CHECKOUT_SOURCES = {
  course: 'carsi-next-local-checkout',
  membership: 'carsi-pro-annual',
} as const;

export type CheckoutExpiredOutcome =
  | 'disabled'
  | 'not_recoverable'
  | 'no_recovery_url'
  | 'no_email'
  | 'opted_out'
  | 'already_sent'
  /** Another delivery holds a recent claim for this session; let Stripe retry. */
  | 'in_flight'
  /** A stale, never-marked claim: the email may have gone out, so it is not resent. */
  | 'possibly_sent'
  /** Email delivery is not configured; retrying cannot help. */
  | 'not_configured'
  | 'sent'
  | 'send_failed';

/** Outcomes the webhook must NOT acknowledge: release the event claim so Stripe retries. */
export function isTransientRecoveryOutcome(outcome: CheckoutExpiredOutcome): boolean {
  return outcome === 'send_failed' || outcome === 'in_flight';
}

export type RecoverySendClaim = 'claimed' | 'already_sent' | 'in_flight' | 'possibly_sent';

/** Atomic per-Checkout-Session send record. */
export type RecoverySendLedger = {
  claim(sessionId: string, now?: Date): Promise<RecoverySendClaim>;
  markSent(sessionId: string): Promise<void>;
  release(sessionId: string): Promise<void>;
};

type ClaimRowDelegate = {
  create(args: { data: { id: string; type: string } }): Promise<unknown>;
  findUnique(args: {
    where: { id: string };
  }): Promise<{ processedAt: Date | null; createdAt: Date } | null>;
  update(args: { where: { id: string }; data: { processedAt: Date } }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

function hasPrismaCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === code);
}

export const RECOVERY_SEND_ROW_TYPE = 'checkout_recovery_email';

/** Row id for a session's send record. Stripe event ids start `evt_`, so these never collide. */
export function recoverySendRowId(sessionId: string): string {
  return `checkout_recovery_email:${sessionId}`;
}

/**
 * The send ledger over the existing `stripe_webhook_events` claim table (same unique-id insert
 * + processedAt pattern as the webhook event claim), so no schema change is needed. Rows are
 * keyed `checkout_recovery_email:<checkout session id>` with type `checkout_recovery_email`.
 */
export function recoverySendLedger(delegate: ClaimRowDelegate): RecoverySendLedger {
  return {
    async claim(sessionId, now = new Date()) {
      const id = recoverySendRowId(sessionId);
      try {
        await delegate.create({ data: { id, type: RECOVERY_SEND_ROW_TYPE } });
        return 'claimed';
      } catch (error) {
        if (!hasPrismaCode(error, 'P2002')) throw error;
      }
      const existing = await delegate.findUnique({ where: { id } });
      if (!existing) return 'in_flight'; // released between our insert and read: retry later
      if (existing.processedAt) return 'already_sent';
      const ageMs = now.getTime() - new Date(existing.createdAt).getTime();
      return ageMs < STALE_CLAIM_MS ? 'in_flight' : 'possibly_sent';
    },
    async markSent(sessionId) {
      await delegate.update({
        where: { id: recoverySendRowId(sessionId) },
        data: { processedAt: new Date() },
      });
    },
    async release(sessionId) {
      try {
        await delegate.delete({ where: { id: recoverySendRowId(sessionId) } });
      } catch (error) {
        if (!hasPrismaCode(error, 'P2025')) throw error;
      }
    },
  };
}

function defaultLedger(): RecoverySendLedger {
  return recoverySendLedger(
    (prisma as unknown as { stripeWebhookEvent: ClaimRowDelegate }).stripeWebhookEvent
  );
}

export type CheckoutRecoveryDeps = {
  env?: NodeJS.ProcessEnv;
  appOrigin: string;
  /** True when this email belongs to a user who opted out of non-essential email. */
  isOptedOut?: (email: string) => Promise<boolean>;
  courseTitle?: (slug: string) => Promise<string | null>;
  send?: typeof sendCheckoutRecoveryEmail;
  ledger?: RecoverySendLedger;
};

async function defaultIsOptedOut(email: string): Promise<boolean> {
  const user = await prisma.lmsUser.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { emailOptOut: true },
  });
  return user?.emailOptOut ?? false;
}

async function defaultCourseTitle(slug: string): Promise<string | null> {
  const course = await prisma.lmsCourse.findUnique({ where: { slug }, select: { title: true } });
  return course?.title ?? null;
}

/**
 * Handle a `checkout.session.expired` event. Never throws for a business condition; a database
 * error throws, and the webhook turns that into a Stripe retry.
 */
export async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session,
  deps: CheckoutRecoveryDeps
): Promise<CheckoutExpiredOutcome> {
  if (!checkoutRecoveryEnabled(deps.env)) return 'disabled';

  const source = session.metadata?.source;
  const isCourse = source === RECOVERABLE_CHECKOUT_SOURCES.course;
  const isMembership = source === RECOVERABLE_CHECKOUT_SOURCES.membership;
  if (!isCourse && !isMembership) return 'not_recoverable';

  const recoveryUrl = session.after_expiration?.recovery?.url;
  if (!recoveryUrl) return 'no_recovery_url';

  const email = (session.customer_details?.email ?? session.customer_email ?? '').trim();
  if (!email) return 'no_email';

  if (await (deps.isOptedOut ?? defaultIsOptedOut)(email)) return 'opted_out';

  let itemName = 'your CARSI yearly membership';
  if (isCourse) {
    const slug = session.metadata?.course_slug?.trim();
    const title = slug ? await (deps.courseTitle ?? defaultCourseTitle)(slug) : null;
    itemName = title ? `"${title}"` : 'your CARSI course';
  }

  const ledger = deps.ledger ?? defaultLedger();
  const claim = await ledger.claim(session.id);
  if (claim !== 'claimed') return claim;

  let result: Awaited<ReturnType<typeof sendCheckoutRecoveryEmail>>;
  try {
    result = await (deps.send ?? sendCheckoutRecoveryEmail)({
      to: email,
      itemName,
      recoveryUrl,
      appOrigin: deps.appOrigin,
    });
  } catch {
    result = { sent: false, reason: 'send_failed' };
  }
  if (!result.sent) {
    await ledger.release(session.id);
    return result.reason === 'not_configured' ? 'not_configured' : 'send_failed';
  }
  await ledger.markSent(session.id);
  return 'sent';
}
