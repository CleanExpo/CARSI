/**
 * GP-764: what a paid course checkout actually cost, read from the Stripe Checkout Session at
 * fulfilment. Only the seat step (`seat-state.ts`) writes the record; this module holds the
 * shape and the one rule for reading Stripe's figures.
 */
import type Stripe from 'stripe';

/** The session's own figures. Null means Stripe did not report it (unknown), never 0. */
export type CheckoutAmountPaid = {
  amountTotalCents: number | null;
  currency: string | null;
  /** When the session was created (Stripe `created`); null when not reported. */
  sessionCreatedAt: Date | null;
};

/**
 * `amount_total` (minor units, after discounts and tax, for all seats), `currency` and `created`
 * from the session that was paid. Anything that is not a whole non-negative number, or not a three-letter
 * currency, is unknown rather than guessed.
 */
export function checkoutAmountPaid(
  session: Pick<Stripe.Checkout.Session, 'amount_total' | 'currency' | 'created'>
): CheckoutAmountPaid {
  const amount = session.amount_total;
  const created = session.created;
  const currency =
    typeof session.currency === 'string' ? session.currency.trim().toLowerCase() : '';
  return {
    amountTotalCents:
      typeof amount === 'number' && Number.isInteger(amount) && amount >= 0 ? amount : null,
    currency: /^[a-z]{3}$/.test(currency) ? currency : null,
    sessionCreatedAt:
      typeof created === 'number' && Number.isInteger(created) && created > 0
        ? new Date(created * 1000)
        : null,
  };
}
