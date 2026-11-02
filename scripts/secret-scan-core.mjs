// Pure secret-classification core (WS5). Shared by scripts/check-secrets.mjs and
// its vitest test (src/lib/security/secret-scan-core.test.ts) so the regexes +
// placeholder logic are actually covered — this backs a required CI gate.

// GENUINELY-SECRET prefixes only. Deliberately EXCLUDES pk_ (Stripe PUBLISHABLE
// key — public by design) and cs_ (Stripe checkout-session id — public) so the
// build-blocking CI scan can't false-positive on legitimately-committed public
// identifiers. The optional live_/test_ infix catches real Stripe keys whose
// underscore would otherwise break the token (sk_live_… / rk_test_…); ck_/whsec_
// have no infix. GP-573: expanded beyond Stripe-only (still not a full trufflehog).
export const STRIPE_SECRET_RE = /(ck|sk|whsec|rk)_(live_|test_)?[A-Za-z0-9]{16,}/;

export const SECRET_PATTERNS = [
  STRIPE_SECRET_RE,
  /ghp_[A-Za-z0-9]{36,}/,
  /github_pat_[A-Za-z0-9_]{22,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[A-Za-z0-9-]{10,48}/,
  /sk-ant-api03-[A-Za-z0-9_-]{20,}/,
  /sk-proj-[A-Za-z0-9_-]{20,}/,
];

/** @deprecated use SECRET_PATTERNS — kept for tests that import SECRET_RE */
export const SECRET_RE = STRIPE_SECRET_RE;

// Placeholder token shapes — applied to the MATCHED TOKEN only (never the whole
// line), so a real key sitting next to an unrelated '...' or '${…}' or 'example'
// elsewhere on the same line is NOT suppressed (the old whole-line check was
// fail-open on that collision).
export const PLACEHOLDER_RE = /xxx|your[_-]|example|redacted|placeholder|changeme|dummy/i;

/**
 * The secret-looking token in a line, or null. A placeholder-shaped token
 * (for example, a token whose suffix is a placeholder label) is ignored.
 */
export function findSecretToken(content) {
  for (const re of SECRET_PATTERNS) {
    const match = content.match(re);
    if (!match) continue;
    const token = match[0];
    if (PLACEHOLDER_RE.test(token)) continue;
    return token;
  }
  return null;
}
