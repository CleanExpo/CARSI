#!/usr/bin/env node
/**
 * GP-567 — JSON-LD reader for the live /courses snapshot, FAIL-CLOSED.
 *
 * Lives in its own module rather than inside build-inventory.mjs so a control can
 * exercise it without running the generator, which writes docs/audit/*.
 *
 * ── Why this is not a `try/catch → null` ──────────────────────────────────
 *
 * The generator used to do:
 *
 *     .map((m) => { try { return JSON.parse(m[1].trim()); } catch { return null; } })
 *     .filter(Boolean)
 *
 * Same class as the round-10 subprocess P1, different mechanism: a failed parse
 * produced a value indistinguishable from a real absence. If the block that
 * fails is the `ItemList`, `itemList` is undefined and `ldCourses` stays EMPTY,
 * so every course silently loses its live name, description, price, currency,
 * availability, courseMode and courseWorkload.
 *
 * Nothing caught it. c1 validates only the artefact's internal shape — rows have
 * a slug, a valid status, presence in some source — and the slugs come from the
 * SITEMAP, not from the JSON-LD. So the row count is unchanged and c1 passes on
 * an inventory that quietly lost a whole source.
 *
 * A block that does not parse is a broken snapshot, not an absent one. Refuse.
 */

const LD_BLOCK = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

/** Thrown when a JSON-LD block is present but unreadable. */
export class LdParseFailure extends Error {
  constructor(message) {
    super(message);
    this.name = 'LdParseFailure';
  }
}

/**
 * Parse every JSON-LD block in `html`. Throws LdParseFailure if any block is
 * present but unparseable — never drops one silently.
 *
 * A page with no JSON-LD at all returns [], which is a real, observable
 * measurement rather than a failure.
 *
 * @param {string} html
 * @returns {unknown[]}
 */
export function parseLdBlocks(html) {
  const blocks = [...html.matchAll(LD_BLOCK)];
  return blocks.map((m, i) => {
    try {
      return JSON.parse(m[1].trim());
    } catch (e) {
      throw new LdParseFailure(
        `JSON-LD block ${i + 1} of ${blocks.length} does not parse (${e.message}). `
        + 'Refusing to continue: dropping it would empty ldCourses, so every course would lose '
        + 'its live name/price/availability while the row count — which comes from the sitemap — '
        + 'stayed the same, and c1 would still pass.',
      );
    }
  });
}
