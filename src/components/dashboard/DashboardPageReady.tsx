'use client';

import { useEffect } from 'react';

import { markDashboardPageReady } from '@/lib/onboarding/page-ready';

/**
 * Tells the onboarding wizard that this page's first view is on screen (GP-627). Render it in a
 * server-rendered page, whose data is already in the HTML, or once a client page has loaded.
 */
export function DashboardPageReady() {
  useEffect(() => {
    markDashboardPageReady();
  }, []);
  return null;
}
