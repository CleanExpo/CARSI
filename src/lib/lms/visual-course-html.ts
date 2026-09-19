import { looksLikeHtmlFragment } from '@/lib/lms/format-course-body';

import { looksLikeMarkdown, markdownToSafeHtml, sanitizeCourseHtml } from './markdown-course-body';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Turn leftover `# Title` / `## Module` lines into real headings. */
export function promoteAtxHeadings(raw: string): string {
  return raw.replace(/^(#{1,6})\s+(.+)$/gm, (_all, hashes: string, text: string) => {
    const depth = Math.min(hashes.length, 6);
    return `<h${depth}>${text.trim()}</h${depth}>`;
  });
}

/**
 * Browsers often apply Bold as `<span style="font-weight:bold">`.
 * Sanitize drops `style`, so those marks vanish on reload unless we
 * rewrite them to `<strong>` / `<em>` first.
 */
export function persistVisualMarks(html: string): string {
  let out = html;
  for (let i = 0; i < 8; i += 1) {
    const next = out.replace(
      /<span\b([^>]*)\sstyle=(["'])([\s\S]*?)\2([^>]*)>([\s\S]*?)<\/span>/gi,
      (_all, before: string, _q: string, style: string, after: string, inner: string) => {
        const s = style.toLowerCase();
        const bold = /font-weight\s*:\s*(bold|[5-9]00)/.test(s);
        const italic = /font-style\s*:\s*italic/.test(s);
        if (!bold && !italic) {
          return `<span${before}${after}>${inner}</span>`;
        }
        let wrapped = inner;
        if (italic) wrapped = `<em>${wrapped}</em>`;
        if (bold) wrapped = `<strong>${wrapped}</strong>`;
        return wrapped;
      }
    );
    if (next === out) break;
    out = next;
  }
  return out.replace(/<\/?b\b[^>]*>/gi, (tag) => (tag.startsWith('</') ? '</strong>' : '<strong>'));
}

function paragraphsFromPlain(raw: string): string {
  return raw
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * HTML the visual editor can show. Authors never see `<p>` / `##` / `&mdash;`.
 * Accepts Markdown, HTML, or the mixed dump compose produces today.
 */
export function sourceToEditorHtml(raw: string): string {
  const source = raw.replace(/\r\n/g, '\n').trim();
  if (!source) return '';

  let html = source;
  if (looksLikeHtmlFragment(source)) {
    html = persistVisualMarks(promoteAtxHeadings(source));
  } else if (looksLikeMarkdown(source)) {
    html = markdownToSafeHtml(source);
  } else {
    html = paragraphsFromPlain(source);
  }

  return sanitizeCourseHtml(html);
}
