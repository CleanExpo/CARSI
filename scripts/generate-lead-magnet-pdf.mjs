#!/usr/bin/env node
/**
 * Lead-magnet PDF generator (GP-199).
 *
 * Deterministically renders a marketing lead-magnet markdown file to a branded
 * A4 PDF at authoring time (the PDF is committed to public/downloads/ — nothing
 * runs at runtime, matching the CARSI "prod runtime never runs npm scripts" rule).
 *
 * Usage:
 *   node scripts/generate-lead-magnet-pdf.mjs
 *
 * Pipeline: markdown → HTML (small converter below, tailored to the constructs
 * used in docs/marketing/lead-magnets/) → Chromium print-to-PDF via the already
 * installed @playwright/test devDependency. No new dependencies.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE = join(ROOT, 'docs/marketing/lead-magnets/government-contractor-guide.md');
const OUTPUT = join(ROOT, 'public/downloads/carsi-government-contractor-guide.pdf');

/** Internal authoring metadata that must not appear in the customer-facing PDF. */
const INTERNAL_LINE_PATTERNS = [
  /^\*\*GP-\d+ \| Lead Magnet[^*]*\*\*$/,
  /^_Lead magnet owner:.*_$/,
  /^_Linear issue:.*_$/,
  /^_Format:.*_$/,
];

// ---------------------------------------------------------------------------
// Markdown → HTML (headings, hr, tables, ul/ol, checkboxes, blockquotes,
// bold/italic inline). Intentionally small and deterministic.
// ---------------------------------------------------------------------------

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:)]|$)/g, '$1<em>$2</em>');
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function markdownToHtml(markdown) {
  const lines = markdown.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || INTERNAL_LINE_PATTERNS.some((re) => re.test(trimmed))) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      out.push('<hr />');
      i += 1;
      continue;
    }

    if (isTableRow(trimmed) && i + 1 < lines.length && /^\s*\|[\s|:-]+\|\s*$/.test(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      out.push('<table><thead><tr>');
      out.push(...headers.map((h) => `<th>${inline(h)}</th>`));
      out.push('</tr></thead><tbody>');
      for (const row of rows) {
        out.push(`<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`);
      }
      out.push('</tbody></table>');
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      out.push('<ul>');
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^[-*]\s+/, '');
        const checkbox = /^\[([ xX])\]\s+(.*)$/.exec(item);
        out.push(
          checkbox
            ? `<li class="checkbox"><span class="box" aria-hidden="true"></span>${inline(checkbox[2])}</li>`
            : `<li>${inline(item)}</li>`,
        );
        i += 1;
      }
      out.push('</ul>');
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      out.push('<ol>');
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        out.push(`<li>${inline(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
        i += 1;
      }
      out.push('</ol>');
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(inline(lines[i].trim().replace(/^>\s?/, '')));
        i += 1;
      }
      out.push(`<blockquote><p>${quote.join(' ')}</p></blockquote>`);
      continue;
    }

    // Paragraph: gather consecutive plain lines.
    const para = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        /^(#{1,4})\s/.test(next) ||
        /^-{3,}$/.test(next) ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        next.startsWith('>') ||
        isTableRow(next)
      ) {
        break;
      }
      para.push(next);
      i += 1;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Branded print template (CARSI blue, A4, AU English).
// ---------------------------------------------------------------------------

const ACCENT = '#146fc2';

function buildDocument(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8" />
<title>How to Get on Government Restoration Panels — CARSI</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1e293b;
    font-size: 10.5pt;
    line-height: 1.55;
    margin: 0;
  }
  .cover {
    background: linear-gradient(135deg, #0d47a1 0%, ${ACCENT} 100%);
    color: #ffffff;
    border-radius: 10px;
    padding: 40px 36px;
    margin-bottom: 28px;
  }
  .cover .brand { font-size: 13pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.92; }
  .cover .brand-sub { font-size: 8.5pt; letter-spacing: 0.06em; opacity: 0.8; margin-top: 2px; }
  .cover h1 { color: #ffffff; border: none; margin: 22px 0 8px; font-size: 24pt; line-height: 1.2; }
  .cover .subtitle { font-size: 12pt; opacity: 0.92; margin: 0; }
  h1, h2, h3, h4 { color: #0f2f52; line-height: 1.25; page-break-after: avoid; }
  h1 { font-size: 19pt; }
  h2 { font-size: 14.5pt; border-bottom: 2px solid ${ACCENT}; padding-bottom: 5px; margin-top: 26px; }
  h3 { font-size: 12pt; margin-top: 18px; }
  h4 { font-size: 10.5pt; color: ${ACCENT}; text-transform: uppercase; letter-spacing: 0.04em; }
  p { margin: 7px 0; }
  hr { border: none; border-top: 1px solid #d7e3f0; margin: 18px 0; }
  ul, ol { margin: 7px 0; padding-left: 20px; }
  li { margin: 3px 0; }
  li.checkbox { list-style: none; position: relative; }
  li.checkbox .box {
    display: inline-block; width: 9px; height: 9px; border: 1.4px solid ${ACCENT};
    border-radius: 2px; margin-right: 7px; margin-left: -17px; vertical-align: baseline;
  }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; page-break-inside: avoid; }
  th { background: ${ACCENT}; color: #ffffff; text-align: left; padding: 6px 8px; }
  td { border: 1px solid #d7e3f0; padding: 5px 8px; vertical-align: top; }
  tr:nth-child(even) td { background: #f4f9ff; }
  blockquote { border-left: 3px solid ${ACCENT}; margin: 10px 0; padding: 4px 14px; color: #334155; background: #f4f9ff; }
  strong { color: #0f2f52; }
</style>
</head>
<body>
  <div class="cover">
    <div class="brand">CARSI</div>
    <div class="brand-sub">Cleaning &amp; Restoration Sciences Institute &middot; IICRC CEC Accredited provider</div>
    <h1>How to Get on Government Restoration Panels</h1>
    <p class="subtitle">A practical guide for Australian restoration contractors</p>
  </div>
${bodyHtml}
</body>
</html>`;
}

// ---------------------------------------------------------------------------

async function main() {
  const markdown = readFileSync(SOURCE, 'utf8');
  // Drop the duplicated title/subtitle — the cover block renders them.
  const withoutTitle = markdown
    .replace(/^# How to Get on Government Restoration Panels\s*\n/, '')
    .replace(/^\s*## A Practical Guide for Australian Restoration Contractors\s*\n/, '');
  const html = buildDocument(markdownToHtml(withoutTitle));

  // Debug aid: --html <path> also writes the intermediate HTML for inspection.
  const htmlFlag = process.argv.indexOf('--html');
  if (htmlFlag !== -1 && process.argv[htmlFlag + 1]) {
    writeFileSync(process.argv[htmlFlag + 1], html);
  }

  mkdirSync(dirname(OUTPUT), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width:100%;font-size:7.5pt;color:#64748b;padding:0 15mm;display:flex;justify-content:space-between;">
          <span>&copy; CARSI &middot; carsi.com.au</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
    });
    writeFileSync(OUTPUT, pdf);
    console.log(`✓ Wrote ${OUTPUT} (${(pdf.length / 1024).toFixed(0)} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('generate-lead-magnet-pdf failed:', err);
  process.exit(1);
});
