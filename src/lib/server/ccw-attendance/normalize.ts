/**
 * CCW/CARSI attendance foundation (unit A) — the SINGLE normalization helper.
 *
 * Reused by BOTH the sign-in write path and the reconcile/match path so that a
 * value stored as `normalizedEmail` / `normalizedBusiness` / `normalizedName`
 * is compared with the identical transform. Never normalize inline elsewhere —
 * always call these functions so writes and matches can never drift apart.
 *
 * Everything here is pure and dependency-free.
 */

/** Collapse runs of any Unicode whitespace to a single ASCII space, and trim. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Email normalization: lower-case, trim, collapse internal whitespace.
 * Deliberately conservative — we do NOT strip dots or `+tags` (Gmail-style)
 * because the email is the login identity and must round-trip exactly for the
 * welcome/reset link. Uniqueness is enforced on this value per event.
 */
export function normalizeEmail(email: string): string {
  return collapseWhitespace(email).toLowerCase();
}

/**
 * Person-name normalization for the name-match fallback: lower-case, trim,
 * collapse whitespace. Punctuation is preserved (hyphenated/apostrophe names
 * are meaningful); only whitespace and case are canonicalised.
 */
export function normalizeName(name: string): string {
  return collapseWhitespace(name).toLowerCase();
}

/**
 * Business-name normalization for the business-match fallback: lower-case,
 * trim, collapse whitespace, AND strip punctuation so that "Bob's Cleaning,
 * Pty. Ltd." and "Bobs Cleaning Pty Ltd" reconcile. Returns an empty string
 * for input that is only punctuation/whitespace — callers should treat an
 * empty normalized business as "no business to match on".
 */
export function normalizeBusiness(business: string): string {
  const stripped = collapseWhitespace(business)
    .toLowerCase()
    // Remove anything that is not a letter, number or space (Unicode-aware).
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return collapseWhitespace(stripped);
}
