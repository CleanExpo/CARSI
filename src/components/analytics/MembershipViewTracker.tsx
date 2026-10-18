'use client';

import { useEffect, useRef } from 'react';

import { trackFunnelEvent } from '@/lib/analytics/track-funnel-event';

interface MembershipViewTrackerProps {
  checkoutEnabled: boolean;
}

/**
 * Fires the `membership_view` funnel event once when /subscribe mounts. The page is a server
 * component, so this small client component is the mount point for the analytics call (the same
 * pattern as CourseViewTracker). The ref keeps it to one event per mount: React's strict mode
 * runs effects twice in development, which counted every visit twice. Until GA4 is configured
 * the event waits in ga4-client's queue rather than being sent to no destination.
 *
 * It takes no account state on purpose (see funnel-events.ts): the visitor's membership status
 * never reaches third-party analytics.
 */
export function MembershipViewTracker({ checkoutEnabled }: MembershipViewTrackerProps) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackFunnelEvent({ name: 'membership_view', checkout_enabled: checkoutEnabled });
    // Once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
