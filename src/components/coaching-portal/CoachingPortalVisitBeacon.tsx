'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * GP-677 — tells the server the member opened a coaching portal page, so every page resets
 * the quiet clock (not only Home and Progress). It lives in the portal layout, which Next.js
 * keeps across client-side navigation, so it sends on every page change rather than relying
 * on the layout re-running. The server keeps the 6-hour throttle, the sign-in, flag and
 * subscription checks; this renders nothing and ignores any failure.
 */
export function CoachingPortalVisitBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    fetch('/api/coaching/portal/accountability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit: true }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
