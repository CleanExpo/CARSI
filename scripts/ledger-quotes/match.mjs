/**
 * GP-719 — the quote matcher shared by the offline check (scripts/check-ledger-quotes.mjs) and
 * the opt-in live fetcher (scripts/check-ledger-quotes-live.mjs). One matcher, so the two can
 * never disagree about what "word for word" means.
 *
 * Normalisation is deliberately narrow (GP-719): whitespace, non-breaking spaces, curly quotes
 * and the degree sign. Nothing else — no case folding, no hyphen or dash folding, no
 * punctuation stripping — because every extra fold is a way for a one-word mutant to pass.
 *
 * A quote may hold several passages separated by " | " (each must appear, in any order), and a
 * passage may be cut with an ellipsis ("…" or "...") into segments that must appear IN ORDER.
 */

/** Hosts that sell or publish licensed standards text. Never fetched, never snapshotted. */
export const LICENSED_HOSTS = Object.freeze([
  'iicrc.org',
  'gilmoreglobal.com',
  'ansi.org',
  'standards.org.au',
  'standards.govt.nz',
  'saiglobal.com',
  'intertekinform.com',
  'techstreet.com',
  'iso.org',
  'iec.ch',
  'astm.org',
  'bsigroup.com',
]);

/** Longest quote (in words) a row citing a licensed source may carry: a title or edition line. */
export const LICENSED_MAX_QUOTE_WORDS = 12;

export function hostOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isLicensedHost(host) {
  if (!host) return false;
  return LICENSED_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

export const isLicensedUrl = (url) => isLicensedHost(hostOf(url));

export function normalise(s) {
  return String(s)
    .replace(/[   ]/g, ' ')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[˚º]/g, '°')
    .replace(/\s+/g, ' ')
    .trim();
}

export const wordCount = (s) => normalise(s).split(' ').filter(Boolean).length;

/** [[segment, ...], ...]: passages (any order), each a list of in-order segments. */
export function splitQuote(quote) {
  return normalise(quote)
    .split(/ \| /)
    .map((p) => p.split(/\s*(?:…|\.\.\.)\s*/).map((s) => s.trim()).filter(Boolean))
    .filter((p) => p.length > 0);
}

/** Does every passage of `quote` appear in `text` (segments in order)? */
export function quoteInText(quote, text) {
  const hay = normalise(text);
  const passages = splitQuote(quote);
  if (passages.length === 0) return false;
  return passages.every((segs) => {
    let from = 0;
    for (const s of segs) {
      const at = hay.indexOf(s, from);
      if (at < 0) return false;
      from = at + s.length;
    }
    return true;
  });
}

/** Does the quote appear within ANY ONE of the given texts? */
export const quoteInAny = (quote, texts) => texts.some((t) => quoteInText(quote, t));
