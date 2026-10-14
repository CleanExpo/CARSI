/**
 * Abandoned-checkout recovery for per-course and membership Stripe Checkout sessions.
 *
 * Ships DARK behind `CHECKOUT_RECOVERY_ENABLED` (absent/off = today's behaviour exactly):
 * - off: no `after_expiration` on new sessions, and `checkout.session.expired` sends nothing.
 * - on:  new sessions ask Stripe for a recovery URL, and an expired CARSI session with that
 *        URL and a buyer email gets one recovery email (users who opted out of non-essential
 *        email get none). Stripe's event-id idempotency in the webhook keeps it to one send.
 * Rollback = set the flag off.
 */
import type Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
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
  | 'sent'
  | 'send_failed';

export type CheckoutRecoveryDeps = {
  env?: NodeJS.ProcessEnv;
  appOrigin: string;
  /** True when this email belongs to a user who opted out of non-essential email. */
  isOptedOut?: (email: string) => Promise<boolean>;
  courseTitle?: (slug: string) => Promise<string | null>;
  send?: typeof sendCheckoutRecoveryEmail;
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

/** Handle a `checkout.session.expired` event. Never throws for a business condition. */
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

  const result = await (deps.send ?? sendCheckoutRecoveryEmail)({
    to: email,
    itemName,
    recoveryUrl,
    appOrigin: deps.appOrigin,
  });
  return result.sent ? 'sent' : 'send_failed';
}
