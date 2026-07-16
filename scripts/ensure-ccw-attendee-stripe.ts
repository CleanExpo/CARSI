#!/usr/bin/env npx tsx
/**
 * Ensure Stripe has the CCW/CARSI attendee yearly membership Price (A$295/yr).
 *
 * Creates (or reuses) Product + Price with lookup_key `carsi_pro_annual_attendee`.
 * Prints the Price id to set as STRIPE_PRICE_PRO_ANNUAL_ATTENDEE in DO.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_... npx tsx scripts/ensure-ccw-attendee-stripe.ts
 */
import Stripe from 'stripe';

import {
  CCW_ATTENDEE_MEMBERSHIP_PRICE_CENTS,
  CCW_ATTENDEE_MEMBERSHIP_PRICE_AUD,
} from '../src/lib/marketing/ccw-roadshow-offer-pack';
import { PRO_ANNUAL_ATTENDEE_LOOKUP_KEY } from '../src/lib/server/subscription-price';

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error('STRIPE_SECRET_KEY is required.');
    process.exit(1);
  }

  const stripe = new Stripe(key);

  const existing = await stripe.prices.list({
    lookup_keys: [PRO_ANNUAL_ATTENDEE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (existing.data[0]?.id) {
    console.log('Already exists:', existing.data[0].id);
    console.log(`Set STRIPE_PRICE_PRO_ANNUAL_ATTENDEE=${existing.data[0].id}`);
    return;
  }

  const product = await stripe.products.create({
    name: 'CARSI Yearly Membership — CCW/CARSI attendee special',
    description: `First-year yearly membership for Business Growth Day attendees (A$${CCW_ATTENDEE_MEMBERSHIP_PRICE_AUD}).`,
    metadata: { plan: 'pro_annual_attendee', source: 'ccw-roadshow-offer' },
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'aud',
    unit_amount: CCW_ATTENDEE_MEMBERSHIP_PRICE_CENTS,
    recurring: { interval: 'year' },
    lookup_key: PRO_ANNUAL_ATTENDEE_LOOKUP_KEY,
    tax_behavior: 'inclusive',
    metadata: { plan: 'pro_annual_attendee' },
  });

  console.log('Created product:', product.id);
  console.log('Created price:', price.id);
  console.log(`Set STRIPE_PRICE_PRO_ANNUAL_ATTENDEE=${price.id}`);
  console.log(`(lookup_key=${PRO_ANNUAL_ATTENDEE_LOOKUP_KEY} also resolves automatically)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
