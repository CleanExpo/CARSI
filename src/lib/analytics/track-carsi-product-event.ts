'use client';

import type { CarsiProductEventPayload } from '@/lib/analytics/carsi-product-events';
import * as ga4 from '@/lib/analytics/ga4-client';
import * as posthogAnalytics from '@/lib/analytics/posthog-client';

/** Product excellence events (role guides, coaching CTAs, marketing pack). */
export function trackCarsiProductEvent(payload: CarsiProductEventPayload): void {
  ga4.trackCarsiProductEvent(payload);
  posthogAnalytics.trackCarsiProductEvent(payload);
}