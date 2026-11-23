'use client';

import { useEffect } from 'react';

import { ROLE_GUIDE_START_EVENT } from '@/lib/analytics/carsi-events';
import { trackCarsiProductEvent } from '@/lib/analytics/track-carsi-product-event';

/** Fires once when the role-guides hub mounts. */
export function RoleGuideHubViewTracker() {
  useEffect(() => {
    trackCarsiProductEvent({ name: ROLE_GUIDE_START_EVENT, context: 'hub' });
  }, []);

  return null;
}