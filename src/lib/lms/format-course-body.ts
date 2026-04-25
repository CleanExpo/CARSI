/**
 * Minimal course body formatting: plain lines with optional `##` headings
 * and `>` blockquotes. Used for DB-backed prose without a full CMS.
 */
export type CourseBodyBlock =
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'ul'; items: string[] };

function splitLongParagraph(text: string): string[] {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return [];
  // Keep authored line breaks / short paragraphs intact.
  if (text.includes('\n') || compact.length < 340) return [text.trim()];

  const sentences = compact.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [compact];
  if (sentences.length < 4) return [text.trim()];

  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    chunks.push(`${sentences[i]}${sentences[i + 1] ?? ''}`.trim());
  }
  return chunks.filter(Boolean);
}

function normalizeLegacyPlainText(raw: string): string {
  let next = raw;
  // Many imported records use pipes to separate references/notes.
  next = next.replace(/\s+\|\s+/g, '\n');
  // Add breathing room before reference-like sections.
  next = next.replace(/\s+(Reference[s]?:)/gi, '\n\n$1');
  return next;
}

function stripQuoteLine(line: string): string {
  const t = line.trimStart();
  if (!t.startsWith('>')) return line.trimEnd();
  return t.replace(/^>\s?/, '').trimEnd();
}

export function parseCourseBody(raw: string): CourseBodyBlock[] {
  const normalized = normalizeLegacyPlainText(raw).replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks: CourseBodyBlock[] = [];
  const para: string[] = [];
  const quote: string[] = [];
  const bullets: string[] = [];

  function flushPara() {
    const joined = para.join('\n').trim();
    if (joined) {
      for (const chunk of splitLongParagraph(joined)) {
        blocks.push({ type: 'p', text: chunk });
      }
    }
    para.length = 0;
  }

  function flushQuote() {
    if (!quote.length) return;
    const inner = quote.map(stripQuoteLine).join('\n').trim();
    if (inner) blocks.push({ type: 'quote', text: inner });
    quote.length = 0;
  }

  function flushBullets() {
    if (!bullets.length) return;
    const items = bullets
      .map((line) => line.trim().replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);
    if (items.length) blocks.push({ type: 'ul', items });
    bullets.length = 0;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('>')) {
      flushBullets();
      flushPara();
      quote.push(line);
      continue;
    }

    if (quote.length) flushQuote();

    if (trimmed.startsWith('##')) {
      flushBullets();
      flushPara();
      const title = trimmed.slice(2).trim();
      if (title) blocks.push({ type: 'h3', text: title });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushPara();
      bullets.push(trimmed);
      continue;
    }

    if (bullets.length) flushBullets();

    if (trimmed === '') {
      flushPara();
      continue;
    }

    para.push(line);
  }

  flushQuote();
  flushBullets();
  flushPara();
  return blocks;
}

/** Treat as HTML when it looks like markup (legacy / WordPress bodies). */
export function looksLikeHtmlFragment(s: string): boolean {
  return /<\s*[a-z!]/i.test(s);
}
