'use client';

import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import type { RenewalSummaryPayload } from '@/types/renewal';

/**
 * The signed-in learner's cycle-aware renewal summary (GP-655), or null while loading or when it
 * cannot be read. Cards fall back to a lifetime total, labelled as such, when it is null.
 */
export function useRenewalSummary(enabled: boolean): RenewalSummaryPayload | null {
  const [summary, setSummary] = useState<RenewalSummaryPayload | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    apiClient
      .get<RenewalSummaryPayload>('/api/lms/gamification/me/renewal-summary')
      .then((s) => {
        if (live) setSummary(s);
      })
      .catch(() => {
        if (live) setSummary(null);
      });
    return () => {
      live = false;
    };
  }, [enabled]);
  return summary;
}
