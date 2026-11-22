import type { CarsiEventName } from '@/lib/analytics/carsi-events';

export interface CarsiProductEventPayload {
  name: CarsiEventName;
  /** From `data-carsi-context` — never PII. */
  context?: string;
  /** Counted route only (no query, no external host) — GP-731. */
  link_path?: string;
}