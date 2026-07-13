// Pure secret-classification core (WS5). Shared by scripts/check-secrets.mjs and
// its vitest test (src/lib/security/secret-scan-core.test.ts) so the regexes +
// placeholder logic are actually covered — this backs a required CI gate.

// GENUINELY-SECRET prefixes only. Deliberately EXCLUDES pk_ (Stripe PUBLISHABLE
// key — public by design) and cs_ (Stripe checkout-session id — public) so the
// build-blocking CI scan can't false-positive on legitimately-committed public
// identifiers. The optional live_/test_ infix catches real Stripe keys whose
// underscore would otherwise break the token (sk_live_… / rk_test_…); ck_/whsec_
// have no infix. Scope: Stripe / WooCommerce style tokens (not a general scanner).
export const SECRET_RE = /(ck|sk|whsec|rk)_(live_|test_)?[A-Za-z0-9]{16,}/;

// Placeholder token shapes — applied to the MATCHED TOKEN only (never the whole
// line), so a real key sitting next to an unrelated '...' or '${…}' or 'example'
// elsewhere on the same line is NOT suppressed (the old whole-line check was
// fail-open on that collision).
export const PLACEHOLDER_RE = /xxx|your[_-]|example|redacted|placeholder|changeme|dummy/i;

/**
 * The secret-looking token in a line, or null. A placeholder-shaped token
 * (ck_xxx, sk_test_placeholder…) is ignored.
 */
export function findSecretToken(content) {
  const match = content.match(SECRET_RE);
  if (!match) return null;
  const token = match[0];
  if (PLACEHOLDER_RE.test(token)) return null;
  return token;
}
