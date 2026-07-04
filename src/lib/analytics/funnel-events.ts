/**
 * Client-side funnel event names + payload shapes shared by GA4 (gtag) and
 * PostHog (WS3 / GP-447 / GitHub #128).
 *
 * These three events instrument the top of the CARSI conversion funnel:
 * viewing an IICRC CEC course detail page, clicking to enrol, and starting
 * Stripe checkout. Kept framework-agnostic so both `ga4-client.ts` and
 * `posthog-client.ts` can consume the same payload without duplicating shape
 * definitions.
 */
export type FunnelEventName = 'course_view' | 'enrol_click' | 'checkout_started';

export interface CourseViewPayload {
  course_slug: string;
  course_title?: string;
}

export interface EnrolClickPayload {
  course_slug: string;
  purchase_mode?: 'self' | 'team';
  is_free?: boolean;
}

export interface CheckoutStartedPayload {
  course_slug: string;
  purchase_mode?: 'self' | 'team';
  value_aud?: number;
}

export type FunnelEventPayload =
  | ({ name: 'course_view' } & CourseViewPayload)
  | ({ name: 'enrol_click' } & EnrolClickPayload)
  | ({ name: 'checkout_started' } & CheckoutStartedPayload);
