import type { CarsiEventName } from '@/lib/analytics/carsi-events';

export interface CarsiProductEventPayload {
  name: CarsiEventName;
  /** From `data-carsi-context` — never PII. */
  context?: string;
  /** Present for link clicks (absolute URL). */
  href?: string;
}