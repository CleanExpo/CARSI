/**
 * GA4 client-side funnel events (WS3 / GP-447 / GitHub #128), sent via the
 * existing `window.gtag` bootstrapped by `GoogleAnalytics.tsx` — no new
 * analytics framework. No-ops cleanly if GA4 is not configured or `gtag`
 * has not loaded yet (e.g. blocked by an ad blocker, or fired before the
 * bootstrap script finishes).
 */
import type { CheckoutStartedPayload, CourseViewPayload, EnrolClickPayload } from './funnel-events';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function sendGa4Event(name: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

export function trackCourseView(payload: CourseViewPayload): void {
  sendGa4Event('course_view', {
    course_slug: payload.course_slug,
    ...(payload.course_title ? { course_title: payload.course_title } : {}),
  });
}

export function trackEnrolClick(payload: EnrolClickPayload): void {
  sendGa4Event('enrol_click', {
    course_slug: payload.course_slug,
    purchase_mode: payload.purchase_mode ?? 'self',
    ...(typeof payload.is_free === 'boolean' ? { is_free: payload.is_free } : {}),
  });
}

export function trackCheckoutStarted(payload: CheckoutStartedPayload): void {
  sendGa4Event('checkout_started', {
    course_slug: payload.course_slug,
    purchase_mode: payload.purchase_mode ?? 'self',
    ...(typeof payload.value_aud === 'number' ? { value: payload.value_aud, currency: 'AUD' } : {}),
  });
}
