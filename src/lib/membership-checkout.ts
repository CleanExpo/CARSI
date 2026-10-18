'use client';

import { trackFunnelEvent } from '@/lib/analytics/track-funnel-event';
import { apiClient } from '@/lib/api/client';

/** The one membership price (A$795/yr, GST included). */
export const MEMBERSHIP_PRICE_AUD = 795;

/**
 * The single boundary where a yearly-membership checkout really starts (V6). Every entry point
 * goes through here: the /subscribe CTA for a signed-in buyer, and the register form for a guest
 * who clicked "Start membership", registered in-flow, and resumes the checkout as the new user.
 *
 * `membership_checkout_started` fires exactly once, here, and only when the server returned a
 * Stripe Checkout URL. A refused call (401 for a guest, 503 while the flag is off) throws to the
 * caller and fires nothing, so a guest's first click does not count; their resumed checkout does.
 *
 * The event carries the price only, never whether this buyer is new or renewing: renewal state
 * is account state and stays out of third-party analytics (see funnel-events.ts).
 *
 * Returns the Stripe URL, or null when the server answered without one. The caller navigates.
 */
export async function createMembershipCheckout(): Promise<string | null> {
  const data = await apiClient.post<{ url?: string; checkout_url?: string }>(
    '/api/lms/subscription/checkout',
    {}
  );
  const url = data.url ?? data.checkout_url;
  if (!url) return null;
  trackFunnelEvent({ name: 'membership_checkout_started', value_aud: MEMBERSHIP_PRICE_AUD });
  return url;
}
