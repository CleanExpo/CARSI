/**
 * Enforced no-verbatim copyright guardrail.
 *
 * Converts the assistant's "don't quote the manual" policy from a prompt request
 * into a deterministic, testable control: blocks any bot answer or drafted contact
 * reply that shares an >= n-consecutive-word (n-gram) run with any source manual
 * passage. Belt-and-braces for the /storm-sourced contact-reply skill (Phase 2);
 * the public bot itself holds no verbatim manual text, so its exposure is near-zero.
 *
 * See docs/specs/2026-07-01-carsi-assistant-and-contact-reply.md §14a.1.
 * Pure function — no I/O, no deps — so it is cheap to unit-test and safe to run
 * before a draft can be queued.
 */

export interface NoVerbatimResult {
  /** true when `text` shares no >= n-word run with any source. */
  ok: boolean;
  /** The first offending normalised n-gram, present only when ok === false. */
  match?: string;
}

/**
 * Normalise prose to a comparable word stream: lowercase, punctuation stripped,
 * whitespace collapsed. Unicode-aware so accented terms compare correctly.
 */
function normalizeWords(input: string): string[] {
  if (typeof input !== 'string' || !input) return [];
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function ngrams(words: string[], n: number): string[] {
  if (words.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) {
    out.push(words.slice(i, i + n).join(' '));
  }
  return out;
}

/**
 * Returns `{ ok: true }` when `text` is safe to publish, or `{ ok: false, match }`
 * when it reproduces an >= n-consecutive-word run found verbatim in any `source`.
 *
 * @param text     Candidate answer or drafted reply.
 * @param sources  Source manual passages the text was grounded in.
 * @param n        Minimum consecutive-word run treated as verbatim copying (default 8).
 */
export function assertNoVerbatimSource(
  text: string,
  sources: string[],
  n = 8
): NoVerbatimResult {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError('n-gram size must be a positive integer');
  }

  const textWords = normalizeWords(text);
  if (textWords.length < n) return { ok: true };

  const sourceGrams = new Set<string>();
  for (const src of sources ?? []) {
    for (const gram of ngrams(normalizeWords(src), n)) {
      sourceGrams.add(gram);
    }
  }
  if (sourceGrams.size === 0) return { ok: true };

  for (const gram of ngrams(textWords, n)) {
    if (sourceGrams.has(gram)) return { ok: false, match: gram };
  }
  return { ok: true };
}
