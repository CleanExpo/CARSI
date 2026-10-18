/**
 * Client-side funnel event names + payload shapes shared by GA4 (gtag) and
 * PostHog (WS3 / GP-447 / GitHub #128).
 *
 * These three events instrument the top of the CARSI conversion funnel:
 * viewing an IICRC CEC course detail page, clicking to enrol, and starting
 * Stripe checkout. Kept framework-agnostic so both `ga4-client.ts` and
 * `posthog-client.ts` can consume the same payload without duplicating shape
 * definitions.
 *
 * The two membership events instrument the yearly membership funnel the same
 * way: viewing /subscribe, then starting its Stripe subscription checkout.
 */
export type FunnelEventName =
  | 'course_view'
  | 'enrol_click'
  | 'checkout_started'
  | 'membership_view'
  | 'membership_checkout_started';

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

/** The learner's membership state as /subscribe resolved it ('none' = signed out or no plan). */
export type MembershipFunnelStatus = 'active' | 'grace' | 'lapsed' | 'none' | 'unknown';

export interface MembershipViewPayload {
  /** False while the membership is still "coming soon" (feature flag off). */
  checkout_enabled: boolean;
  membership_status: MembershipFunnelStatus;
}

export interface MembershipCheckoutStartedPayload {
  /** True when a lapsed member is renewing rather than joining. */
  is_renewal: boolean;
  value_aud?: number;
}

export type FunnelEventPayload =
  | ({ name: 'course_view' } & CourseViewPayload)
  | ({ name: 'enrol_click' } & EnrolClickPayload)
  | ({ name: 'checkout_started' } & CheckoutStartedPayload)
  | ({ name: 'membership_view' } & MembershipViewPayload)
  | ({ name: 'membership_checkout_started' } & MembershipCheckoutStartedPayload);
