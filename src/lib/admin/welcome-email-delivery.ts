/**
 * Whether the welcome email — which carries the ONLY copy of the temporary
 * password a membership grant issues — actually reached the member, and how to
 * describe a failure to the operator looking at it.
 *
 * This lives apart from `admin-yearly-membership` because BOTH admin surfaces
 * need it and that module reaches for Prisma, so a client component cannot
 * import from it. Splitting the pure part out is what lets the yearly-membership
 * panel and the CCW roadshow roster say the same thing about the same condition
 * instead of one rendering prose and the other a raw machine token.
 *
 * Type-only import: erased at compile time, so nothing server-side is pulled
 * into a client bundle.
 */
import type { SendEmailResult } from '@/lib/server/email';

/**
 * Every reason the mailer itself can give, plus `unknown` for a failure it did
 * not explain.
 *
 * DERIVED from `SendEmailResult` on purpose. Re-typing the union by hand is how
 * `unknown` came to be missing from one copy of it: the value was returned at
 * runtime while a hand-written union said it could not be. Deriving means a new
 * mailer reason widens this automatically and fails the exhaustive map below to
 * COMPILE, rather than silently degrading to generic copy in front of an
 * operator.
 */
export type WelcomeEmailFailureReason = NonNullable<SendEmailResult['reason']> | 'unknown';

export type WelcomeEmailDelivery = {
  /** True ONLY when the message was handed to the email provider. */
  delivered: boolean;
  /** Why it did not reach the member; null when it did. */
  reason: WelcomeEmailFailureReason | null;
};

/**
 * PURE, so the classification is testable without an email provider.
 *
 * `sent: true` is NOT sufficient. `sendEmail` also returns `sent: true` with
 * `reason: 'dev_console'` when it merely prints the message to the server log —
 * which happens whenever `MAILTRAP_API_KEY` is unset with the dev console on, and
 * on provider errors and network failures in that mode. The member cannot read a
 * server log, so for the question this type answers — does this person have their
 * password? — dev-console output is a NON-delivery.
 */
export function describeWelcomeEmailDelivery(result: SendEmailResult): WelcomeEmailDelivery {
  const reachedProvider = result.sent && result.reason !== 'dev_console';
  if (reachedProvider) return { delivered: true, reason: null };
  // `sent: false` with no reason is still a non-delivery. It gets its OWN label
  // rather than borrowing `send_failed`: that reason means something specific
  // (the request threw before the provider answered), and an operator reads the
  // label as a diagnosis.
  return { delivered: false, reason: result.reason ?? 'unknown' };
}

/**
 * Operator-facing cause, exhaustive over the union by construction.
 *
 * `send_failed` and `provider_error` are NOT interchangeable and an operator
 * diagnosing a lockout acts on the difference: in `sendEmail`, `send_failed`
 * comes from the catch block — the request threw before any provider response
 * (network, DNS, timeout) — while `provider_error` is the provider answering and
 * refusing.
 */
const FAILURE_DETAIL: Record<WelcomeEmailFailureReason, string> = {
  not_configured: 'no email provider is configured on this environment',
  send_failed: 'the send failed before the provider answered (network or timeout)',
  provider_error: 'the email provider rejected it',
  dev_console: 'it was only written to the server console, not posted',
  unknown: 'the send did not complete and gave no reason',
};

export function describeWelcomeEmailFailure(reason: WelcomeEmailFailureReason | null): string {
  return reason === null ? 'the send did not complete' : FAILURE_DETAIL[reason];
}

/**
 * What the operator must DO. Reached the provider is NOT reached the person: an
 * accepted message still bounces or lands in spam, and the password exists
 * nowhere else. A second comp is refused (409 `already_comped`) and would rotate
 * the password afresh if it were not, so the recovery is always a password
 * reset — which is worth saying on the SUCCESS path too, not only on failure.
 */
export const WELCOME_EMAIL_RECOVERY =
  'If it does not arrive, send a password reset — do not grant or comp again.';
