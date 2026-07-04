/**
 * Version-tolerant readers for Stripe subscription/invoice shapes.
 *
 * On the pinned API version (`2026-02-25.clover`, SDK v20) the period end moved
 * OFF the Subscription object and ONTO its items
 * (`subscription.items.data[].current_period_end`), and Invoices reference their
 * subscription under `invoice.parent.subscription_details.subscription` rather
 * than a top-level `invoice.subscription`. These helpers read the current shape
 * and fall back to the legacy shape so a future/rollback API version still maps.
 */

import type Stripe from 'stripe';

/** Unix-seconds → Date, or null when absent/invalid. */
function secondsToDate(value: unknown): Date | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const d = new Date(value * 1000);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Read the subscription's current period end. Prefers the item-level field
 * (current SDK); falls back to a legacy top-level `current_period_end`.
 * Returns the LATEST item period end when items disagree (multi-item safety).
 */
export function readCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const items = subscription.items?.data ?? [];
  let latest: number | null = null;
  for (const item of items) {
    const raw = (item as unknown as { current_period_end?: number }).current_period_end;
    if (typeof raw === 'number' && (latest === null || raw > latest)) latest = raw;
  }
  if (latest !== null) return secondsToDate(latest);

  const legacy = (subscription as unknown as { current_period_end?: number }).current_period_end;
  return secondsToDate(legacy);
}

/** Whether the subscription is set to cancel at period end. */
export function readCancelAtPeriodEnd(subscription: Stripe.Subscription): boolean {
  return Boolean(
    (subscription as unknown as { cancel_at_period_end?: boolean }).cancel_at_period_end,
  );
}

/** Stripe customer id from a subscription (id string or expanded object). */
export function readCustomerId(
  obj: Stripe.Subscription | Stripe.Invoice,
): string | null {
  const customer = (obj as unknown as { customer?: unknown }).customer;
  if (typeof customer === 'string') return customer;
  if (customer && typeof customer === 'object' && 'id' in customer) {
    const id = (customer as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

/**
 * Extract the subscription id an invoice belongs to. Prefers the current
 * `parent.subscription_details.subscription` shape; falls back to the legacy
 * top-level `invoice.subscription`.
 */
export function readInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = (invoice as unknown as {
    parent?: { subscription_details?: { subscription?: unknown } | null } | null;
  }).parent;
  const fromParent = parent?.subscription_details?.subscription;
  if (typeof fromParent === 'string') return fromParent;
  if (fromParent && typeof fromParent === 'object' && 'id' in fromParent) {
    const id = (fromParent as { id?: unknown }).id;
    if (typeof id === 'string') return id;
  }

  const legacy = (invoice as unknown as { subscription?: unknown }).subscription;
  if (typeof legacy === 'string') return legacy;
  if (legacy && typeof legacy === 'object' && 'id' in legacy) {
    const id = (legacy as { id?: unknown }).id;
    if (typeof id === 'string') return id;
  }
  return null;
}

/** Customer email from an invoice (used to map to a CARSI user). */
export function readInvoiceEmail(invoice: Stripe.Invoice): string | null {
  const email = (invoice as unknown as { customer_email?: unknown }).customer_email;
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
}
