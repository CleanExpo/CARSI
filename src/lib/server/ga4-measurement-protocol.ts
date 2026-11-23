/**
 * GA4 Measurement Protocol (server-side events), WS3 / GP-447 / GitHub #128.
 *
 * Fires GA4 events from server code (webhooks, background jobs) where there is
 * no browser `gtag` — e.g. the Stripe `checkout.session.completed` webhook
 * sending a `purchase` event with the course slug + value.
 *
 * BOUNDARY NOTE (see PR body): this utility is intentionally generic
 * (`sendGa4MeasurementProtocolEvent`) so the parallel E1 annual-entitlement
 * branch (feat/gp-441-e1-annual-entitlement) can reuse it for its own
 * `subscription_started` / `renewed` / `lapsed` events without needing a
 * second Measurement Protocol client. This WS3 change does NOT add or call
 * any subscription_* event — only the existing one-off `purchase` event.
 *
 * No-ops (resolves without throwing or sending a request) when
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID` or `GA4_MEASUREMENT_PROTOCOL_API_SECRET`
 * is unset, so local/dev/CI environments never fire real events.
 *
 * CONSENT (GP-732): nothing is sent unless the caller passes
 * `analyticsConsent: true`, which callers derive from the visitor's choice as
 * recorded on the Stripe session or subscription at checkout
 * (`hasAnalyticsConsent` in ./analytics-consent). A missing or unknown choice
 * sends nothing. No GA4 `user_id` is ever sent: the learner's account id stays
 * out of third-party analytics, as it does in the browser (GP-731 / GP-750).
 */

const MEASUREMENT_PROTOCOL_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

export interface Ga4MeasurementProtocolEvent {
  /** GA4 event name, e.g. "purchase". */
  name: string;
  /** GA4 event params, e.g. { currency: 'AUD', value: 199, course_slug: '...' }. */
  params: Record<string, unknown>;
  /**
   * The pseudonymous identifier GA4 requires for Measurement Protocol hits.
   * We don't have a GA4 client_id from the server, so callers pass the Stripe
   * object the event is about (checkout session or subscription id). Never a
   * learner's account id, email or name.
   */
  clientId: string;
  /**
   * The visitor's analytics choice for this purchase (GP-732). Only `true`
   * sends; derive it with `hasAnalyticsConsent(stripeObject.metadata)`.
   */
  analyticsConsent: boolean;
}

function getMeasurementId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || undefined;
}

function getApiSecret(): string | undefined {
  return process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET?.trim() || undefined;
}

/** True when both the measurement id and API secret are configured. */
export function isGa4MeasurementProtocolEnabled(): boolean {
  return Boolean(getMeasurementId() && getApiSecret());
}

/**
 * Send a single event to GA4 via the Measurement Protocol. Reusable by any
 * server path (webhooks, jobs) — not specific to the one-off purchase flow.
 * Never throws: network/config failures are logged and swallowed so a GA4
 * outage can never block webhook fulfilment or checkout completion.
 */
export async function sendGa4MeasurementProtocolEvent(
  event: Ga4MeasurementProtocolEvent,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<{ sent: boolean; status?: number }> {
  const measurementId = getMeasurementId();
  const apiSecret = getApiSecret();
  const fetchImpl = opts.fetchImpl ?? fetch;

  if (event.analyticsConsent !== true) {
    return { sent: false };
  }

  if (!measurementId || !apiSecret) {
    return { sent: false };
  }

  const url = `${MEASUREMENT_PROTOCOL_ENDPOINT}?measurement_id=${encodeURIComponent(
    measurementId,
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  const body = {
    client_id: event.clientId,
    events: [{ name: event.name, params: event.params }],
  };

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // GA4 MP returns 204 with no body on success. Any 2xx counts as sent.
    return { sent: res.ok, status: res.status };
  } catch (e) {
    console.error('[ga4-measurement-protocol] failed to send event', {
      name: event.name,
      error: e instanceof Error ? e.message : String(e),
    });
    return { sent: false };
  }
}

/**
 * Convenience wrapper for the WS3 one-off course `purchase` event fired from
 * the Stripe webhook. Kept separate from the generic sender above so call
 * sites (webhook route) stay declarative; E1 should add its own
 * `sendSubscriptionLifecycleEvent`-style wrapper alongside this one rather
 * than modifying it.
 */
export async function sendGa4PurchaseEvent(input: {
  clientId: string;
  analyticsConsent: boolean;
  courseSlug: string;
  valueAud: number;
  transactionId: string;
}): Promise<{ sent: boolean; status?: number }> {
  return sendGa4MeasurementProtocolEvent({
    name: 'purchase',
    clientId: input.clientId,
    analyticsConsent: input.analyticsConsent,
    params: {
      currency: 'AUD',
      value: input.valueAud,
      transaction_id: input.transactionId,
      course_slug: input.courseSlug,
      items: [{ item_id: input.courseSlug, item_name: input.courseSlug }],
    },
  });
}
