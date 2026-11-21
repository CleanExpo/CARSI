/**
 * The visitor's analytics choice, carried from the browser to server-side GA4 events (GP-732).
 *
 * Server-side Measurement Protocol events (Stripe `purchase`, subscription lifecycle) fire from
 * webhooks, long after the visitor's request. So the checkout routes read the choice from the
 * request cookie and store it on the Stripe checkout session (and on the subscription, for
 * renewals and lapses). The webhook reads it back from that metadata.
 *
 * Fail-closed: only the exact value `granted` permits a send. A refusal, a missing cookie, a
 * missing metadata key or any other value is `denied` or `unknown`, and nothing is sent.
 *
 * The browser consent banner (GP-731) writes ANALYTICS_CONSENT_COOKIE. Until it does, every
 * checkout records `unknown` and no server-side GA4 event is sent.
 */

/** First-party cookie the consent banner writes: `granted` or `denied`. */
export const ANALYTICS_CONSENT_COOKIE = 'carsi_analytics_consent';

/** Stripe metadata key (checkout session and subscription) holding the choice at checkout. */
export const ANALYTICS_CONSENT_METADATA_KEY = 'analytics_consent';

export type AnalyticsConsent = 'granted' | 'denied' | 'unknown';

export function parseAnalyticsConsent(raw: unknown): AnalyticsConsent {
  if (raw === 'granted') return 'granted';
  if (raw === 'denied') return 'denied';
  return 'unknown';
}

type CookieReader = { cookies: { get(name: string): { value: string } | undefined } };

/** The choice the request carries; `unknown` when there is no recognisable cookie. */
export function readAnalyticsConsent(request: CookieReader): AnalyticsConsent {
  return parseAnalyticsConsent(request.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value);
}

/** Stripe metadata recording the choice. Always written, so `denied` and `unknown` are explicit. */
export function analyticsConsentMetadata(consent: AnalyticsConsent): Record<string, string> {
  return { [ANALYTICS_CONSENT_METADATA_KEY]: consent };
}

/** The choice stored on a Stripe object's metadata; `unknown` when absent. */
export function analyticsConsentFromMetadata(
  metadata: Record<string, string> | null | undefined
): AnalyticsConsent {
  return parseAnalyticsConsent(metadata?.[ANALYTICS_CONSENT_METADATA_KEY]);
}
