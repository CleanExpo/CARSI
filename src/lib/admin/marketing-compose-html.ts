import DOMPurify from 'isomorphic-dompurify';

import { persistVisualMarks, sourceToEditorHtml } from '@/lib/lms/visual-course-html';

const PURIFY = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['img'] as string[],
  ADD_ATTR: ['target', 'rel', 'href', 'title', 'src', 'alt'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'meta', 'link'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style', 'class', 'id'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
};

/** Sanitize compose HTML (client + server). */
export function sanitizeMarketingComposeHtml(html: string): string {
  const cleaned = DOMPurify.sanitize(html, PURIFY);
  return persistVisualMarks(cleaned);
}

/** Paste from ChatGPT, Word, Gmail, etc. → safe editor HTML. */
export function prepareMarketingPasteHtml(rawHtml: string, plainFallback: string): string {
  const source = rawHtml.trim() || plainFallback;
  return sanitizeMarketingComposeHtml(sourceToEditorHtml(source));
}

export function marketingComposeHtmlToPlainText(html: string): string {
  if (!html.trim()) return '';
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    return (el.textContent ?? el.innerText ?? '').trim();
  }
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
