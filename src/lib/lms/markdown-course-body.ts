import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

const MARKDOWN_HINT =
  /(?:^|\n)\s{0,3}#{1,6}\s|\*\*[^*]+\*\*|__[^_]+__|`{1,3}|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|(?:^|\n)\s{0,3}>\s|(?:^|\n)\s*[-*+]\s+|(?:^|\n)\s*\d+\.\s+|\|.+\|/;

/** True when the body is authored Markdown (not a WordPress HTML dump). */
export function looksLikeMarkdown(raw: string): boolean {
  const s = raw.trim();
  if (!s || /<\s*[a-z!/]/i.test(s)) return false;
  return MARKDOWN_HINT.test(s);
}

function isSafeHref(href: string): boolean {
  const t = href.trim();
  if (!t) return false;
  if (t.startsWith('#') || t.startsWith('/')) return true;
  try {
    const u = new URL(t, 'https://carsi.com.au');
    return ['https:', 'http:', 'mailto:'].includes(u.protocol);
  } catch {
    return false;
  }
}

function isSafeImgSrc(src: string): boolean {
  const t = src.trim();
  if (!t) return false;
  try {
    const u = new URL(t, 'https://carsi.com.au');
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Parse Markdown to sanitized HTML. Never throws on invalid Markdown —
 * marked is resilient; empty input yields an empty string.
 */
export function markdownToSafeHtml(raw: string): string {
  const source = raw.replace(/\r\n/g, '\n').trim();
  if (!source) return '';

  let html = '';
  try {
    html = marked.parse(source, { async: false }) as string;
    html = decorateModuleHeadings(html);
  } catch {
    html = `<p>${escapeHtml(source)}</p>`;
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['img'],
    ADD_ATTR: ['target', 'rel', 'src', 'alt', 'href', 'title', 'class'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
  });
}

/** Turn `## Module 2 — Dry` into a kicker + title heading. */
function decorateModuleHeadings(html: string): string {
  return html.replace(
    /<h2>(?:\s*#{0,6}\s*)?(Module\s+(\d+)\s*[—–\-:]\s*)([^<]*)<\/h2>/gi,
    '<h2 class="course-mod"><span class="course-mod-kicker">Module $2</span><span class="course-mod-title">$3</span></h2>'
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function sanitizeCourseHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
    ALLOW_DATA_ATTR: false,
  });
}

export function hrefIsSafeForCourse(href: string): boolean {
  return isSafeHref(href);
}

export function imgSrcIsSafeForCourse(src: string): boolean {
  return isSafeImgSrc(src);
}
