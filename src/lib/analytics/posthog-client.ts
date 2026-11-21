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

import {
  isAllowedTextParam,
  isCountedPath,
  safeLocation,
  safePathname,
  safeReferrer,
} from './consent';
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

/**
 * PostHog's own bookkeeping that is kept as it is: ids PostHog generates itself, the library
 * version and the browser, screen and time zone. None of it is written by the page or the visitor.
 */
const POSTHOG_OWN_KEYS: ReadonlySet<string> = new Set([
  'token',
  'distinct_id',
  '$device_id',
  '$session_id',
  '$window_id',
  '$insert_id',
  '$time',
  '$lib',
  '$lib_version',
  '$lib_custom_api_host',
  '$config_defaults',
  '$is_identified',
  '$process_person_profile',
  '$browser',
  '$browser_version',
  '$browser_language',
  '$browser_language_prefix',
  '$os',
  '$os_version',
  '$device',
  '$device_type',
  '$screen_height',
  '$screen_width',
  '$viewport_height',
  '$viewport_width',
  '$timezone',
  '$timezone_offset',
  '$configured_session_timeout_ms',
  '$lib_rate_limit_remaining_tokens',
]);

/**
 * The properties sent, rebuilt from an allow-list (GP-731): the address as its route form
 * (/courses/:slug) with only plain campaign tags, the referrer as its clean form, the event's own
 * listed parameters, and PostHog's own bookkeeping. Every other property (a title, a campaign
 * value, a search, anything added later) is dropped rather than cleaned.
 */
function allowedProperties(
  properties: Record<string, unknown> | undefined,
  origin: string,
  address: string
): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (POSTHOG_OWN_KEYS.has(key)) {
      if (typeof value === 'string' && (value.includes('@') || value.includes('://'))) continue;
      kept[key] = value;
    } else if (!key.startsWith('$') && isAllowedTextParam(key, value)) {
      kept[key] = value;
    }
  }
  kept.$current_url = address;
  kept.$host = new URL(origin).host;
  kept.$pathname = safePathname(window.location.pathname);
  const referrer = safeReferrer(properties?.$referrer, origin);
  kept.$referrer = referrer || '$direct';
  kept.$referring_domain = referrer ? new URL(referrer).host : '$direct';
  return kept;
}

/**
 * The same rules as Google Analytics (GP-731): nothing without a yes, nothing about a private
 * page, and for a public page only the allow-listed properties. Person properties ($set,
 * $set_once) are never sent.
 */
export function scrubPostHogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event || typeof window === 'undefined') return null;
  if (getAnalyticsChoice() !== 'granted') return null;
  const { origin, pathname, search } = window.location;
  if (!isCountedPath(pathname)) return null;
  const address = safeLocation(origin, pathname, search);
  if (address === '') return null;
  const scrubbed = {
    ...event,
    properties: allowedProperties(event.properties as Record<string, unknown>, origin, address),
  } as CaptureResult;
  delete (scrubbed as { $set?: unknown }).$set;
  delete (scrubbed as { $set_once?: unknown }).$set_once;
  return scrubbed;
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
    // Campaign tags and the referrer are not stored on the visitor's person record (GP-731).
    save_campaign_params: false,
    save_referrer: false,
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
