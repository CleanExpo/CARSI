/**
 * Server-side subscription lifecycle analytics (GA4 Measurement Protocol).
 * Fires only when GA4 MP env vars are set; never blocks webhook fulfilment.
 */

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
}): Promise<void> {
  const clientId = input.userId ?? input.subscriptionId;
  await sendGa4MeasurementProtocolEvent({
    name: input.event,
    clientId,
    userId: input.userId,
    params: {
      plan: input.plan,
      subscription_id: input.subscriptionId,
      ...(input.valueAud != null ? { currency: 'AUD', value: input.valueAud } : {}),
    },
  });
}
