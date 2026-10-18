'use client';

import { useEffect } from 'react';

import type { MembershipFunnelStatus } from '@/lib/analytics/funnel-events';
import { trackFunnelEvent } from '@/lib/analytics/track-funnel-event';

interface MembershipViewTrackerProps {
  checkoutEnabled: boolean;
  status: MembershipFunnelStatus;
}

/**
 * Fires the `membership_view` funnel event once when /subscribe mounts. The page is a server
 * component, so this small client component is the mount point for the analytics call (the same
 * pattern as CourseViewTracker).
 */
export function MembershipViewTracker({ checkoutEnabled, status }: MembershipViewTrackerProps) {
  useEffect(() => {
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
