/**
 * PostHog client init + funnel events (WS3 / GP-447 / GitHub #128).
 *
 * Cleanly no-ops when `NEXT_PUBLIC_POSTHOG_KEY` is unset — no network calls,
 * no thrown errors, safe to import and call from any client component
 * regardless of environment. Initialises lazily on first use so it never
 * runs during SSR/build.
 */
'use client';

import posthog, { type CaptureResult } from 'posthog-js';

import { isCountedPath, safeLocationOf, safeReferrer } from './consent';
import { getAnalyticsChoice, onAnalyticsWithdrawn } from './consent-client';

import type {
  CheckoutStartedPayload,
  CourseViewPayload,
  EnrolClickPayload,
  MembershipCheckoutStartedPayload,
  MembershipViewPayload,
} from './funnel-events';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

let initialised = false;
let optedOut = false;

const URL_PROPERTIES = ['$current_url', '$initial_current_url'];
const REFERRER_PROPERTIES = ['$referrer', '$initial_referrer'];

function scrubProperties(properties: Record<string, unknown> | undefined, origin: string): void {
  if (!properties) return;
  for (const key of URL_PROPERTIES) {
    if (key in properties) properties[key] = safeLocationOf(properties[key], origin);
  }
  for (const key of REFERRER_PROPERTIES) {
    if (key in properties) properties[key] = safeReferrer(properties[key], origin) || '$direct';
  }
}

/**
 * The same address rules as Google Analytics (GP-731): nothing about a private page, and only the
 * clean address and referrer of a public one.
 */
export function scrubPostHogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event || typeof window === 'undefined') return null;
  if (getAnalyticsChoice() !== 'granted') return null;
  const { origin, pathname } = window.location;
  if (!isCountedPath(pathname)) return null;
  scrubProperties(event.properties as Record<string, unknown>, origin);
  if ('$pathname' in (event.properties ?? {}))
    (event.properties as Record<string, unknown>).$pathname = pathname;
  scrubProperties(event.$set as Record<string, unknown> | undefined, origin);
  scrubProperties(event.$set_once as Record<string, unknown> | undefined, origin);
  return event;
}

function ensureInitialised(): boolean {
  if (!posthogKey) return false;
  if (typeof window === 'undefined') return false;
  // Nothing loads or is sent without a stored yes (GP-731).
  if (getAnalyticsChoice() !== 'granted') return false;
  if (initialised) {
    if (optedOut) {
      posthog.opt_in_capturing();
      optedOut = false;
    }
    return true;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: 'identified_only',
    capture_pageview: false,
    autocapture: false,
    before_send: scrubPostHogEvent,
  });
  initialised = true;
  onAnalyticsWithdrawn(() => {
    posthog.opt_out_capturing();
    optedOut = true;
  });
  return true;
}

function capture(event: string, properties: Record<string, unknown>): void {
  if (!ensureInitialised()) return;
  posthog.capture(event, properties);
}

export function isPostHogEnabled(): boolean {
  return Boolean(posthogKey);
}

export function trackCourseView(payload: CourseViewPayload): void {
  capture('course_view', {
    course_slug: payload.course_slug,
    ...(payload.course_title ? { course_title: payload.course_title } : {}),
  });
}

export function trackEnrolClick(payload: EnrolClickPayload): void {
  capture('enrol_click', {
    course_slug: payload.course_slug,
    purchase_mode: payload.purchase_mode ?? 'self',
    ...(typeof payload.is_free === 'boolean' ? { is_free: payload.is_free } : {}),
  });
}

export function trackCheckoutStarted(payload: CheckoutStartedPayload): void {
  capture('checkout_started', {
    course_slug: payload.course_slug,
    purchase_mode: payload.purchase_mode ?? 'self',
    ...(typeof payload.value_aud === 'number' ? { value: payload.value_aud, currency: 'AUD' } : {}),
  });
}

export function trackMembershipView(payload: MembershipViewPayload): void {
  capture('membership_view', {
    checkout_enabled: payload.checkout_enabled,
  });
}

export function trackMembershipCheckoutStarted(payload: MembershipCheckoutStartedPayload): void {
  capture('membership_checkout_started', {
    ...(typeof payload.value_aud === 'number' ? { value: payload.value_aud, currency: 'AUD' } : {}),
  });
}
