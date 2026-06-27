import DOMPurify from 'isomorphic-dompurify';

export type HtmlLessonBlock =
  | { type: 'paragraph'; html: string }
  | { type: 'list'; items: Array<{ html: string }> };

function sanitizeFragment(html: string): string {
  return DOMPurify.sanitize(html.trim(), {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'b', 'i', 'u', 'a', 'br', 'span', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function extractListItems(listHtml: string): string[] {
  const items: string[] = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(listHtml)) !== null) {
    const inner = sanitizeFragment(m[1]);
    if (stripTags(inner)) items.push(inner);
  }
  return items;
}

/** Parse authored HTML lesson bodies into render blocks — content is not modified. */
export function parseHtmlLessonBlocks(html: string): HtmlLessonBlock[] {
  const raw = html.trim();
  if (!raw) return [];

  const blocks: HtmlLessonBlock[] = [];
  let remaining = raw;

  const listRe = /<(ul|ol)[^>]*>[\s\S]*?<\/\1>/gi;
  let listMatch: RegExpExecArray | null;
  const listSpans: Array<{ start: number; end: number; html: string }> = [];

  while ((listMatch = listRe.exec(raw)) !== null) {
    listSpans.push({
      start: listMatch.index,
      end: listMatch.index + listMatch[0].length,
      html: listMatch[0],
    });
  }

  let cursor = 0;
  for (const span of listSpans) {
    const before = raw.slice(cursor, span.start);
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pm: RegExpExecArray | null;
    while ((pm = pRe.exec(before)) !== null) {
      const inner = sanitizeFragment(pm[1]);
      if (stripTags(inner)) blocks.push({ type: 'paragraph', html: inner });
    }
    const items = extractListItems(span.html);
    if (items.length > 0) blocks.push({ type: 'list', items: items.map((html) => ({ html })) });
    cursor = span.end;
  }

  const tail = raw.slice(cursor);
  const tailRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tailRe.exec(tail)) !== null) {
    const inner = sanitizeFragment(tm[1]);
    if (stripTags(inner)) blocks.push({ type: 'paragraph', html: inner });
  }

  if (blocks.length === 0 && stripTags(raw)) {
    blocks.push({ type: 'paragraph', html: sanitizeFragment(raw) });
  }

  return blocks;
}

export function splitListItemTitle(html: string): { title: string | null; body: string } {
  const strong = html.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
  if (strong?.[1]) {
    const title = stripTags(strong[1]);
    const body = stripTags(html.replace(/<strong[^>]*>[\s\S]*?<\/strong>/i, '').replace(/^[—–\-:\s]+/, ''));
    return { title: title || null, body };
  }
  return { title: null, body: stripTags(html) };
}
