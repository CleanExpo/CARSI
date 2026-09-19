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
    html = promoteAtxHeadings(source);
  } else if (looksLikeMarkdown(source)) {
    html = markdownToSafeHtml(source);
  } else {
    html = paragraphsFromPlain(source);
  }

  return sanitizeCourseHtml(html);
}
