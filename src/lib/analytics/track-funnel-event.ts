/**
 * Single call-site entry point for the three client funnel events
 * (WS3 / GP-447 / GitHub #128): fires GA4 (via the existing gtag bootstrap)
 * and PostHog (no-op if unconfigured) together so callers don't need to
 * import and call both analytics libs individually.
 */
'use client';

import * as ga4 from './ga4-client';
import type { FunnelEventPayload } from './funnel-events';
import * as posthogAnalytics from './posthog-client';

export function trackFunnelEvent(payload: FunnelEventPayload): void {
  switch (payload.name) {
    case 'course_view':
      ga4.trackCourseView(payload);
      posthogAnalytics.trackCourseView(payload);
      return;
    case 'enrol_click':
      ga4.trackEnrolClick(payload);
      posthogAnalytics.trackEnrolClick(payload);
      return;
    case 'checkout_started':
      ga4.trackCheckoutStarted(payload);
      posthogAnalytics.trackCheckoutStarted(payload);
      return;
  }
}
