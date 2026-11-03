/** GP-634: the three downloadable resource items in a member's marketing pack. */
import { safeText, sanitizeVoice } from './site-review';
import type { ChecklistItem, SiteReview, SocialCalendar, TradeVoice } from './types';

export const MARKETING_PACK_DOWNLOADS = [
  {
    id: 'review',
    title: 'Website and Google review',
    description: 'Plain-English review with your fixes ranked, most useful first.',
    filename: 'website-and-google-review.md',
    contentType: 'text/markdown; charset=utf-8',
  },
  {
    id: 'checklist',
    title: 'Local-search checklist',
    description: 'The basics for showing up when locals search for your trade.',
    filename: 'local-search-checklist.md',
    contentType: 'text/markdown; charset=utf-8',
  },
  {
    id: 'calendar',
    title: '30-day social calendar',
    description: 'A month of draft posts in your voice. Opens in Excel or Google Sheets.',
    filename: '30-day-social-calendar.csv',
    contentType: 'text/csv; charset=utf-8',
  },
] as const;

export type MarketingPackDownloadId = (typeof MARKETING_PACK_DOWNLOADS)[number]['id'];

export function isMarketingPackDownloadId(v: string | null): v is MarketingPackDownloadId {
  return MARKETING_PACK_DOWNLOADS.some((d) => d.id === v);
}

function heading(rawVoice: TradeVoice, title: string, generatedAt: string): string {
  const voice = sanitizeVoice(rawVoice);
  const who = 'Your business';
  const day = new Date(generatedAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `# ${title}\n\n${who}${voice.town ? `, ${voice.town}` : ''}. Prepared ${day} by your CARSI coaching portal.\n`;
}

export function renderReviewMarkdown(
  review: SiteReview,
  voice: TradeVoice,
  generatedAt: string
): string {
  const lines = [heading(voice, 'Website and Google review', generatedAt), review.summary, ''];
  lines.push(`Website: ${safeText(review.websiteUrl, 'none on file')}`);
  lines.push(`Google Business Profile: ${safeText(review.googleBusinessUrl, 'none on file')}`, '');
  if (review.fixes.length > 0) {
    lines.push('## Your fixes, most useful first', '');
    for (const f of review.fixes) {
      lines.push(
        `### ${f.rank}. ${f.title}`,
        '',
        `Why it matters: ${f.why}`,
        '',
        `How to fix it: ${f.how}`,
        ''
      );
    }
  }
  if (review.checks.length > 0) {
    lines.push('## What we checked', '');
    for (const c of review.checks) lines.push(`- [${c.passed ? 'x' : ' '}] ${c.label}`);
    lines.push('');
  }
  lines.push('Your coach reviews each fix before it is added to your action list.');
  return `${lines.join('\n')}\n`;
}

export function renderChecklistMarkdown(
  items: ChecklistItem[],
  voice: TradeVoice,
  generatedAt: string
): string {
  const lines = [heading(voice, 'Local-search checklist', generatedAt)];
  for (const i of items) lines.push(`- [${i.done ? 'x' : ' '}] **${i.label}**. ${i.detail}`);
  return `${lines.join('\n')}\n`;
}

function csvCell(v: string): string {
  // Neutralise spreadsheet formulas, then quote.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function renderCalendarCsv(calendar: SocialCalendar): string {
  const rows = [['Day', 'Date', 'Theme', 'Caption', 'Hashtags'].map(csvCell).join(',')];
  for (const p of calendar.posts) {
    rows.push(
      [String(p.day), p.date, p.theme, p.caption, p.hashtags.join(' ')].map(csvCell).join(',')
    );
  }
  // BOM so Excel opens UTF-8 correctly.
  return `﻿${rows.join('\r\n')}\r\n`;
}
