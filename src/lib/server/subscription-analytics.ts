/**
 * Server-side subscription lifecycle analytics (GA4 Measurement Protocol).
 * Fires only when GA4 MP env vars are set; never blocks webhook fulfilment.
 * Fires only when the subscription's metadata records the visitor's yes to
 * analytics at checkout (GP-732); a missing or unknown choice sends nothing.
 * The learner's account id is never sent to Google.
 */

import { hasAnalyticsConsent } from '@/lib/server/analytics-consent';
import { sendGa4MeasurementProtocolEvent } from '@/lib/server/ga4-measurement-protocol';

export type SubscriptionLifecycleEvent =
  | 'subscription_started'
  | 'subscription_renewed'
  | 'subscription_lapsed';

export async function trackSubscriptionLifecycleEvent(input: {
  event: SubscriptionLifecycleEvent;
  plan: string;
  subscriptionId: string;
  /** The subscription's Stripe metadata, which carries the checkout-time analytics choice. */
  metadata: Record<string, string | undefined> | null | undefined;
  valueAud?: number;
}): Promise<void> {
  await sendGa4MeasurementProtocolEvent({
    name: input.event,
    clientId: input.subscriptionId,
    analyticsConsent: hasAnalyticsConsent(input.metadata),
    params: {
      plan: input.plan,
      subscription_id: input.subscriptionId,
      ...(input.valueAud != null ? { currency: 'AUD', value: input.valueAud } : {}),
    },
  });
}
