'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/**
 * Silent UTM capture component — mount in the root layout wrapped in Suspense.
 *
 * On first load with UTM params present, stores them in sessionStorage under
 * the key `carsi_utm`.  After login, the auth hook reads this key and POSTs to
 * POST /api/lms/marketing/utm-capture to persist the attribution data.
 *
 * Uses sessionStorage (not localStorage) so UTM data is scoped to the
 * originating browser tab only.
 */
export function UtmCapture() {
  const params = useSearchParams();

  useEffect(() => {
    const captured: Record<string, string> = {};
    UTM_KEYS.forEach((key) => {
      const val = params.get(key);
      if (val) captured[key] = val;
    });

    if (Object.keys(captured).length > 0) {
      sessionStorage.setItem(
        'carsi_utm',
        JSON.stringify({
          ...captured,
          page_path: window.location.pathname,
        })
      );
    }
  }, [params]);

  return null;
}
