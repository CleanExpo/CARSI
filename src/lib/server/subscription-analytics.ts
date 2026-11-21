/**
 * Server-side subscription lifecycle analytics (GA4 Measurement Protocol).
 * Fires only when GA4 MP env vars are set and the subscriber granted analytics at checkout
 * (GP-732: the choice is stored on the subscription's metadata); never blocks webhook fulfilment.
 */

import type { AnalyticsConsent } from '@/lib/analytics/analytics-consent';
import { sendGa4MeasurementProtocolEvent } from '@/lib/server/ga4-measurement-protocol';

export type SubscriptionLifecycleEvent =
  | 'subscription_started'
  | 'subscription_renewed'
  | 'subscription_lapsed';

export async function trackSubscriptionLifecycleEvent(input: {
  event: SubscriptionLifecycleEvent;
  plan: string;
  userId?: string;
  subscriptionId: string;
  valueAud?: number;
  consent: AnalyticsConsent;
}): Promise<void> {
  const clientId = input.userId ?? input.subscriptionId;
  await sendGa4MeasurementProtocolEvent({
    name: input.event,
    clientId,
    userId: input.userId,
    consent: input.consent,
    params: {
      plan: input.plan,
      subscription_id: input.subscriptionId,
      ...(input.valueAud != null ? { currency: 'AUD', value: input.valueAud } : {}),
    },
  });
}
