/**
 * Validation for caller-supplied Stripe return URLs (`success_url`, `cancel_url`, `return_url`).
 *
 * Six checkout/portal routes accepted any string that merely `startsWith('http')` and handed it
 * straight to Stripe. A crafted checkout link therefore returned a *paying* customer to an
 * attacker-controlled page after a genuine CARSI transaction — the payment itself is unaffected
 * and no funds are diverted, but a lookalike page arriving immediately after a real purchase is
 * about the most credible phishing moment there is, and CARSI's own checkout supplies it.
 *
 * Every legitimate caller already builds these from `window.location.origin`
 * (register-form, GuestEnrolForm, EnrolButton, OnboardingProgramClient), so restricting to
 * known origins costs nothing and closes the redirect.
 *
 * Note on the allowlist: matching only the canonical site URL would reject every real client
 * URL. `getPublicSiteUrl()` defaults to the apex `https://carsi.com.au` while the site serves
 * `https://www.carsi.com.au`, so the browser's own origin would not match its own canonical.
 * Both the www and apex forms are therefore accepted, along with the request's origin — which
 * covers dev, preview and platform hostnames, and concedes nothing: a caller who can forge the
 * Host header can already steer the defaults this function falls back to.
 */
import { getPublicSiteUrl } from '@/lib/env/public-url';

function withSiblingHost(origin: string): string[] {
  try {
    const url = new URL(origin);
    const host = url.host;
    const sibling = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
    return [`${url.protocol}//${host}`, `${url.protocol}//${sibling}`];
  } catch {
    return [];
  }
}

/**
 * Origins a Stripe return URL may point at.
 *
 * ENVIRONMENTAL DEPENDENCY, stated because it is easy to lose. `requestOrigin` is always
 * `request.nextUrl.origin` at the six call sites, which is derived from the Host header. Folding
 * it into the allowlist is therefore safe only while the platform rejects a forged Host. It does
 * today: a request to production with `Host: evil.example` is rejected at the edge with 403
 * before it reaches the application (measured 2026-08-18).
 *
 * That dependency is not introduced here and is wider than this function — every one of those
 * routes already builds its DEFAULT success and cancel URLs from the same `origin`, so a caller
 * who could forge Host would steer the fallback whether or not this allowlist existed. But if
 * CARSI ever moves to a host that forwards arbitrary Host headers, this becomes
 * attacker-controllable and so does every default URL beside it. The test file pins the
 * behaviour so that change surfaces as a failing expectation rather than a silent one.
 */
export function allowedCheckoutOrigins(requestOrigin?: string | null): string[] {
  const origins = new Set<string>();
  for (const o of withSiblingHost(getPublicSiteUrl())) origins.add(o);
  if (requestOrigin) for (const o of withSiblingHost(requestOrigin)) origins.add(o);
  return [...origins];
}

/**
 * Return `candidate` when it is an absolute http(s) URL pointing at an allowed origin, otherwise
 * `fallback`. An invalid or off-origin URL is never an error the caller has to handle — it
 * quietly loses its override and gets the server-built default, which is always correct.
 *
 * The candidate is returned VERBATIM rather than re-serialised: Stripe return URLs carry the
 * literal `{CHECKOUT_SESSION_ID}` placeholder, and round-tripping through `new URL()` would
 * percent-encode the braces and break session lookup on the success page.
 */
export function resolveCheckoutRedirect(
  candidate: unknown,
  requestOrigin: string | null | undefined,
  fallback: string,
): string {
  if (typeof candidate !== 'string' || candidate.trim() === '') return fallback;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return fallback;
  }

  // Rules out javascript:, data: and other schemes that `startsWith('http')` also let through
  // whenever they merely began with those characters.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback;

  return allowedCheckoutOrigins(requestOrigin).includes(parsed.origin) ? candidate : fallback;
}
