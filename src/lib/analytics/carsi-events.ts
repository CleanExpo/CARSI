/** Phase 5 — stable product event names (GA4 + PostHog via `CarsiProductEventCollector`). */
export const COURSE_CTA_EVENT = 'course_cta';
export const COACHING_CTA_EVENT = 'coaching_cta';
export const ROLE_GUIDE_START_EVENT = 'role_guide_start';
export const MARKETING_PACK_BUILD_EVENT = 'marketing_pack_build';

const CARSi_EVENT_NAMES = [
  COURSE_CTA_EVENT,
  COACHING_CTA_EVENT,
  ROLE_GUIDE_START_EVENT,
  MARKETING_PACK_BUILD_EVENT,
] as const;

export type CarsiEventName = (typeof CARSi_EVENT_NAMES)[number];

export function isCarsiEventName(value: string): value is CarsiEventName {
  return (CARSi_EVENT_NAMES as readonly string[]).includes(value);
}