'use client';

import { useEffect } from 'react';

import { isCarsiEventName } from '@/lib/analytics/carsi-events';
import { safePathname } from '@/lib/analytics/consent';
import { resolveCarsiDataEventTarget } from '@/lib/analytics/resolve-carsi-data-event-target';
import { trackCarsiProductEvent } from '@/lib/analytics/track-carsi-product-event';

/**
 * Delegated click listener for `data-carsi-event` / `data-carsi-context` (Phase 5).
 * Mounted once in the root layout alongside GA4.
 */
export function CarsiProductEventCollector() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const el = resolveCarsiDataEventTarget(event.target);
      if (!el) return;

      const name = el.getAttribute('data-carsi-event');
      if (!name || !isCarsiEventName(name)) return;

      const context = el.getAttribute('data-carsi-context')?.trim() || undefined;
      let link_path: string | undefined;
      if (el instanceof HTMLAnchorElement) {
        try {
          const path = safePathname(new URL(el.href).pathname);
          if (path) link_path = path;
        } catch {
          /* ignore bad href */
        }
      }

      trackCarsiProductEvent({ name, context, link_path });
    };

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}