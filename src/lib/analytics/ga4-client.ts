/**
 * GA4 client-side funnel events (WS3 / GP-447 / GitHub #128), sent via the
 * existing `window.gtag` bootstrapped by `GoogleAnalytics.tsx` — no new
 * analytics framework. No-ops cleanly if GA4 is not configured or `gtag`
 * has not loaded yet (e.g. blocked by an ad blocker, or fired before the
 * bootstrap script finishes).
 */
import type {
  CheckoutStartedPayload,
  CourseViewPayload,
  EnrolClickPayload,
  MembershipCheckoutStartedPayload,
  MembershipViewPayload,
} from './funnel-events';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Events fired before GA4 has bootstrapped. `GoogleAnalytics.tsx` loads `/ga-init.js`
 * afterInteractive, so an event fired on mount (membership_view, course_view) can arrive before
 * `window.gtag` exists; it used to be dropped. It now waits here and is delivered exactly once
 * when gtag appears, through gtag itself, so whatever GA4 is configured to honour (consent mode,
 * opt-out) still applies. If gtag never arrives (no measurement id, blocked, opted out) the queue
 * is dropped after the wait: nothing is sent by any other route.
 */
export const GA4_QUEUE_POLL_MS = 250;
export const GA4_QUEUE_MAX_POLLS = 40; // ~10 s, longer than GoogleAnalytics' own 5 s readiness wait
const GA4_QUEUE_CAP = 20;

let pending: Array<[string, Record<string, unknown>]> = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function flushPending(): boolean {
  if (typeof window.gtag !== 'function') return false;
  const batch = pending;
  pending = [];
  for (const [name, params] of batch) window.gtag('event', name, params);
  return true;
}

function sendGa4Event(name: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function' && pending.length === 0) {
    window.gtag('event', name, params);
    return;
  }
  if (pending.length < GA4_QUEUE_CAP) pending.push([name, params]);
  if (flushPending() || flushTimer) return;
  let polls = 0;
  flushTimer = setInterval(() => {
    polls += 1;
    const delivered = flushPending();
    if (delivered || polls >= GA4_QUEUE_MAX_POLLS) {
      if (!delivered) pending = [];
      if (flushTimer) clearInterval(flushTimer);
      flushTimer = null;
    }
  }, GA4_QUEUE_POLL_MS);
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

export function trackMembershipView(payload: MembershipViewPayload): void {
  sendGa4Event('membership_view', {
    checkout_enabled: payload.checkout_enabled,
    membership_status: payload.membership_status,
  });
}

export function trackMembershipCheckoutStarted(payload: MembershipCheckoutStartedPayload): void {
  sendGa4Event('membership_checkout_started', {
    is_renewal: payload.is_renewal,
    ...(typeof payload.value_aud === 'number' ? { value: payload.value_aud, currency: 'AUD' } : {}),
  });
}
