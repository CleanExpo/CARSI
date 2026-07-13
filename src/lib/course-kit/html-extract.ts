/**
 * Deterministic HTML extractors for the course-asset-kit engine (GP-488).
 *
 * These are the load-bearing, extractive-ONLY primitives that turn a lesson's
 * delivered `contentBody` HTML into the raw material for scaffolds. They pull
 * text that ALREADY EXISTS in the lesson; they never generate, summarise or
 * invent. Everything downstream (cards, slides, briefs) is assembled from what
 * these return, so a scaffold can only ever contain delivered content or empty
 * fields.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

/** Decode the small set of HTML entities that appear in CARSI lesson bodies. */
export function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-zA-Z]+);/g, (whole, name: string) => NAMED_ENTITIES[name] ?? whole);
}

/** Strip all tags, decode entities and collapse whitespace to a single line. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  const withoutTags = html
    // Drop script/style blocks entirely.
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    // Turn block boundaries into spaces so words don't glue together.
    .replace(/<\/?[^>]+>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

/** Extract the inner text of every element matching a tag name. */
function extractByTag(html: string | null | undefined, tag: string): string[] {
  if (!html) return [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = htmlToText(m[1]);
    if (text) out.push(text);
  }
  return out;
}

/** Heading elements (h1–h6) in document order, with their level. */
export function extractHeadings(html: string | null | undefined): Array<{ level: number; text: string }> {
  if (!html) return [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  const out: Array<{ level: number; text: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = htmlToText(m[2]);
    if (text) out.push({ level: Number(m[1]), text });
  }
  return out;
}

/** `<li>` items in document order. */
export function extractListItems(html: string | null | undefined): string[] {
  return extractByTag(html, 'li');
}

/** `<p>` paragraphs in document order. */
export function extractParagraphs(html: string | null | undefined): string[] {
  return extractByTag(html, 'p');
}

/** `<blockquote>` callouts in document order. */
export function extractBlockquotes(html: string | null | undefined): string[] {
  return extractByTag(html, 'blockquote');
}

/**
 * Split plain text into sentences. Deterministic and intentionally simple:
 * splits on `.`, `!`, `?` followed by whitespace. Used to lift short bullet-
 * sized statements out of dense paragraphs without inventing anything.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Extract the "key statements" from a lesson body — the extractive backbone of
 * flashcards. These are the list items and blockquotes (the deliberately-set-
 * apart, atomic statements an author already wrote), de-duplicated in order.
 */
export function extractKeyStatements(html: string | null | undefined): string[] {
  const statements = [...extractListItems(html), ...extractBlockquotes(html)];
  return dedupe(statements);
}

/**
 * Extract slide bullets from a lesson body: list items first (already atomic),
 * then, if there are none, the first sentence of each paragraph. Capped so a
 * scaffold slide stays a slide, not a wall of text.
 */
export function extractBullets(html: string | null | undefined, max = 6): string[] {
  const listItems = extractListItems(html);
  const source = listItems.length > 0 ? listItems : extractParagraphs(html).map((p) => splitSentences(p)[0] ?? p);
  return dedupe(source.filter(Boolean)).slice(0, max);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
