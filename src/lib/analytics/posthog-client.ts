/**
 * PostHog client init + funnel events (WS3 / GP-447 / GitHub #128).
 *
 * Cleanly no-ops when `NEXT_PUBLIC_POSTHOG_KEY` is unset — no network calls,
 * no thrown errors, safe to import and call from any client component
 * regardless of environment. Initialises lazily on first use so it never
 * runs during SSR/build.
 */
'use client';

import posthog from 'posthog-js';

import type { CheckoutStartedPayload, CourseViewPayload, EnrolClickPayload } from './funnel-events';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

let initialised = false;

function ensureInitialised(): boolean {
  if (!posthogKey) return false;
  if (initialised) return true;
  if (typeof window === 'undefined') return false;

  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: 'identified_only',
    capture_pageview: false,
    autocapture: false,
  });
  initialised = true;
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
