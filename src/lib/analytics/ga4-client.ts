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
 * Events wait here until GA4 has a configured destination. `GoogleAnalytics.tsx` loads
 * `/ga-init.js` afterInteractive and issues `gtag('config', id)` only after its own readiness
 * poll, while an event fired on mount (membership_view, course_view) can arrive first. Under
 * Google's routing rule an event sent before any `config` has no default destination
 * (https://developers.google.com/tag-platform/gtagjs/routing), so the event used to be lost.
 *
 * Now nothing is sent until `markGa4Configured()` is called straight after the config command;
 * then every queued event goes out once, in order, through gtag itself, so whatever GA4 is
 * configured to honour (consent mode, opt-out) still applies. If GA4 never configures (no
 * measurement id, script blocked) the queue is dropped after the wait: nothing is sent another way.
 */
export const GA4_QUEUE_WAIT_MS = 10_000; // longer than GoogleAnalytics' own 5 s readiness wait
const GA4_QUEUE_CAP = 20;

let configured = false;
let pending: Array<[string, Record<string, unknown>]> = [];
let dropTimer: ReturnType<typeof setTimeout> | null = null;

function canSend(): boolean {
  return configured && typeof window.gtag === 'function';
}

function flushPending(): void {
  if (!canSend()) return;
  if (dropTimer) clearTimeout(dropTimer);
  dropTimer = null;
  const batch = pending;
  pending = [];
  for (const [name, params] of batch) window.gtag!('event', name, params);
}

/** Called by GoogleAnalytics.tsx immediately after it sends `gtag('config', measurementId)`. */
export function markGa4Configured(): void {
  configured = true;
  flushPending();
}

function sendGa4Event(name: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (canSend() && pending.length === 0) {
    window.gtag!('event', name, params);
    return;
  }
  if (pending.length < GA4_QUEUE_CAP) pending.push([name, params]);
  flushPending();
  if (pending.length === 0 || dropTimer) return;
  dropTimer = setTimeout(() => {
    pending = [];
    dropTimer = null;
  }, GA4_QUEUE_WAIT_MS);
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
  });
}

export function trackMembershipCheckoutStarted(payload: MembershipCheckoutStartedPayload): void {
  sendGa4Event('membership_checkout_started', {
    ...(typeof payload.value_aud === 'number' ? { value: payload.value_aud, currency: 'AUD' } : {}),
  });
}
