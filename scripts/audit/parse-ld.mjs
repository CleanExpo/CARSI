#!/usr/bin/env node
/**
 * GP-567 — JSON-LD reader for the live /courses snapshot, FAIL-CLOSED.
 *
 * Lives in its own module rather than inside build-inventory.mjs so a control can
 * exercise it without running the generator, which writes docs/audit/*.
 *
 * ── Why this is not a `try/catch → null` (round 12's subject) ─────────────
 *
 * The generator used to do:
 *
 *     .map((m) => { try { return JSON.parse(m[1].trim()); } catch { return null; } })
 *     .filter(Boolean)
 *
 * Same class as the round-10 subprocess P1, different mechanism: a failed parse
 * produced a value indistinguishable from a real absence. If the block that fails
 * is the `ItemList`, `itemList` is undefined and `ldCourses` stays EMPTY, so every
 * course silently loses its live name, description, price, currency, availability,
 * courseMode and courseWorkload.
 *
 * Nothing caught it. c1 validates only the artefact's internal shape — rows have a
 * slug, a valid status, presence in some source — and the slugs come from the
 * SITEMAP, not from the JSON-LD. So the row count is unchanged and c1 passes on an
 * inventory that quietly lost a whole source.
 *
 * ── Why this uses a real HTML parser (round 12's P1) ──────────────────────
 *
 * The first fix threw on an unparseable block, but found blocks with the regex
 *
 *     /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
 *
 * which only recognises a DOUBLE-QUOTED, whitespace-free `type`. Independent
 * review pointed out that `type='application/ld+json'` and `type = "..."` are
 * equally valid HTML and were read as "no block present" rather than as a parse
 * failure — reintroducing the very class the fix was closing, one layer down.
 * Attribute order, case, unquoted values and a `; charset=` parameter are all the
 * same hole.
 *
 * The lesson from this series is to stop approximating a parser and use one. The
 * question "is this element a JSON-LD script" is decided by the HTML spec, so it
 * is answered by a spec-compliant parser, not by a pattern that has to be widened
 * every time a reviewer thinks of another valid spelling. parse5 does the
 * tokenising: it lowercases attribute names, resolves all three quoting styles,
 * and hands back a normalised value.
 */
import { parse } from 'parse5';

/** Thrown when a JSON-LD block is present but unreadable. */
export class LdParseFailure extends Error {
  constructor(message) {
    super(message);
    this.name = 'LdParseFailure';
  }
}

const LD_MIME = 'application/ld+json';

/** Every element in the tree, including inside <template> content. */
function* walk(node) {
  const kids = node.childNodes || [];
  for (const child of kids) {
    yield child;
    if (child.content) yield* walk(child.content);
    yield* walk(child);
  }
}

/**
 * Is this a JSON-LD script element?
 *
 * parse5 has already lowercased the attribute NAME and stripped the quoting, so
 * the only normalisation left is the MIME value itself: trim it, lowercase it,
 * and drop any `; charset=utf-8` parameter. A <script> with no type attribute is
 * JavaScript per the HTML spec, not JSON-LD, so it is correctly excluded.
 */
function isLdScript(node) {
  if (node.nodeName !== 'script') return false;
  const type = (node.attrs || []).find((a) => a.name === 'type');
  if (!type) return false;
  return type.value.split(';')[0].trim().toLowerCase() === LD_MIME;
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
  const scripts = [...walk(parse(html))].filter(isLdScript);
  return scripts.map((node, i) => {
    const raw = (node.childNodes || []).map((c) => c.value || '').join('');
    try {
      return JSON.parse(raw.trim());
    } catch (e) {
      throw new LdParseFailure(
        `JSON-LD block ${i + 1} of ${scripts.length} does not parse (${e.message}). `
        + 'Refusing to continue: dropping it would empty ldCourses, so every course would lose '
        + 'its live name/price/availability while the row count — which comes from the sitemap — '
        + 'stayed the same, and c1 would still pass.',
      );
    }
  });
}
