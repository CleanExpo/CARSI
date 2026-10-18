'use client';

import { useEffect, useRef } from 'react';

import type { MembershipFunnelStatus } from '@/lib/analytics/funnel-events';
import { trackFunnelEvent } from '@/lib/analytics/track-funnel-event';

interface MembershipViewTrackerProps {
  checkoutEnabled: boolean;
  status: MembershipFunnelStatus;
}

/**
 * Fires the `membership_view` funnel event once when /subscribe mounts. The page is a server
 * component, so this small client component is the mount point for the analytics call (the same
 * pattern as CourseViewTracker). The ref keeps it to one event per mount: React's strict mode
 * runs effects twice in development, which counted every visit twice. If GA4 has not loaded yet
 * the event waits in ga4-client's queue rather than being dropped.
 */
export function MembershipViewTracker({ checkoutEnabled, status }: MembershipViewTrackerProps) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackFunnelEvent({
      name: 'membership_view',
      checkout_enabled: checkoutEnabled,
      membership_status: status,
    });
    // Once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
