/**
 * Printable CARSI manuals for the 2-day carpet cleaning workshop.
 *
 * - Participant manual: built from the live course lessons, so the download always matches
 *   what the learner sees in the LMS. Enrolled attendees and staff only.
 * - Instructor manual: rendered from docs/course-content/ccw-workshop/instructor-guide.md.
 *   Authorised CARSI instructors and admins only.
 *
 * Both are returned as a self-contained HTML document with print styles ("Save as PDF" from
 * the browser), private and never cached by a shared cache.
 */
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

import { CARSI_PROVIDER_STATUS } from '@/lib/iicrc/approved-wording';
export const WORKSHOP_MANUAL_PARTNER_CREDIT =
  'Delivered on the CARSI roadshow with partner venue Carpet Cleaners Warehouse (CCW).';

export interface ManualLesson {
  title: string;
  contentBody: string | null;
}

export interface ManualModule {
  title: string;
  lessons: ManualLesson[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'br', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'code', 'pre', 'a',
    ],
    ALLOWED_ATTR: ['href'],
  });
}

const PRINT_CSS = `
  :root { color-scheme: light; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a;
         max-width: 820px; margin: 0 auto; padding: 32px 20px 64px; line-height: 1.55; background: #fff; }
  header.cover { border-bottom: 3px solid #146fc2; padding-bottom: 20px; margin-bottom: 28px; }
  header.cover .brand { font-weight: 700; letter-spacing: .18em; color: #146fc2; font-size: 13px; }
  header.cover h1 { font-size: 30px; margin: 8px 0 6px; }
  header.cover .sub { color: #475569; margin: 0; }
  .restricted { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px 14px; border-radius: 8px;
                font-weight: 600; margin: 16px 0 0; }
  nav.toc ol { padding-left: 20px; } nav.toc li { margin: 2px 0; }
  section.module { page-break-before: always; }
  section.module h2 { color: #146fc2; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; }
  footer { margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 12px; color: #64748b; font-size: 12px; }
  .print { margin: 16px 0; } .print button { font: inherit; padding: 8px 14px; border-radius: 8px;
           border: 1px solid #146fc2; background: #146fc2; color: #fff; cursor: pointer; }
  @media print { .print { display: none; } body { padding: 0; } }
`;

function documentShell(opts: {
  title: string;
  subtitle: string;
  restricted?: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(opts.title)} | CARSI</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<header class="cover">
  <div class="brand">CARSI</div>
  <h1>${escapeHtml(opts.title)}</h1>
  <p class="sub">${escapeHtml(opts.subtitle)}</p>
  ${opts.restricted ? `<p class="restricted">${escapeHtml(opts.restricted)}</p>` : ''}
</header>
<div class="print"><button type="button" onclick="window.print()">Print or save as PDF</button></div>
${opts.body}
<footer>
  <p>&copy; CARSI. ${escapeHtml(WORKSHOP_MANUAL_PARTNER_CREDIT)}</p>
  <p>${CARSI_PROVIDER_STATUS} This workshop carries no IICRC CECs; attending both days earns a CARSI certificate of attendance.</p>
</footer>
</body>
</html>`;
}

export function renderParticipantManual(courseTitle: string, modules: ManualModule[]): string {
  const toc = modules
    .map((m, i) => `<li><a href="#m${i + 1}">${escapeHtml(m.title)}</a></li>`)
    .join('');
  const sections = modules
    .map(
      (m, i) => `<section class="module" id="m${i + 1}">
<h2>${escapeHtml(m.title)}</h2>
${m.lessons
  .map((l) => `<h3>${escapeHtml(l.title)}</h3>\n${sanitize(l.contentBody ?? '')}`)
  .join('\n')}
</section>`
    )
    .join('\n');
  return documentShell({
    title: `${courseTitle} — Participant Manual`,
    subtitle: 'Your take-home manual from the two workshop days.',
    body: `<nav class="toc"><h2>Contents</h2><ol>${toc}</ol></nav>\n${sections}`,
  });
}

export const INSTRUCTOR_MANUAL_RESTRICTION =
  'Restricted: authorised CARSI instructors only. Do not distribute to participants.';

export function renderInstructorManual(markdown: string): string {
  const html = sanitize(marked.parse(markdown, { async: false, gfm: true }) as string);
  return documentShell({
    title: 'CARSI Carpet Cleaning Workshop — Instructor Manual',
    subtitle: 'Run sheet, station set-up, teaching points and answer keys.',
    restricted: INSTRUCTOR_MANUAL_RESTRICTION,
    body: html,
  });
}

/** Response headers for a private, per-user document. */
export const PRIVATE_DOCUMENT_HEADERS: Record<string, string> = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'private, no-store',
  'x-robots-tag': 'noindex, nofollow',
};
