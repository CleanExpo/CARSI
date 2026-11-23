/**
 * The visitor's analytics choice, carried from the browser to the server-side GA4 events
 * (GP-732).
 *
 * The browser keeps the choice in localStorage (GP-731, `src/lib/analytics/consent.ts`), so the
 * server cannot read it. Each checkout request sends the choice in its body; the checkout route
 * writes it onto the Stripe Checkout Session (and, for a membership, onto the subscription), and
 * the webhook reads it back before it sends anything to Google.
 *
 * Fail closed: an event is sent only when the metadata says `granted` under the current notice
 * version. A missing, malformed or older record, or any other value, sends nothing.
 */
import { CONSENT_NOTICE_VERSION } from '@/lib/analytics/consent';

export const ANALYTICS_CONSENT_METADATA_KEY = 'analytics_consent';
export const ANALYTICS_CONSENT_VERSION_METADATA_KEY = 'analytics_consent_version';

/** True only for the exact string the browser sends for a stored yes. */
export function analyticsConsentFromBody(value: unknown): boolean {
  return value === 'granted';
}

/** The Stripe metadata that records the choice at checkout. A "no" is recorded as a "no". */
export function analyticsConsentMetadata(granted: boolean): Record<string, string> {
  return {
    [ANALYTICS_CONSENT_METADATA_KEY]: granted ? 'granted' : 'denied',
    [ANALYTICS_CONSENT_VERSION_METADATA_KEY]: CONSENT_NOTICE_VERSION,
  };
}

/** True only when Stripe metadata records a yes under the current notice version. */
export function hasAnalyticsConsent(
  metadata: Record<string, string | undefined> | null | undefined
): boolean {
  if (!metadata) return false;
  return (
    metadata[ANALYTICS_CONSENT_METADATA_KEY] === 'granted' &&
    metadata[ANALYTICS_CONSENT_VERSION_METADATA_KEY] === CONSENT_NOTICE_VERSION
  );
}
