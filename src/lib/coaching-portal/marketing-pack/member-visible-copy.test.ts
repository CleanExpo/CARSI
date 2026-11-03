/**
 * Codex P1 (head 0a953a79): every member-visible line in the pack must pass the claim filter,
 * including text built from member-supplied inputs (business name, trade, town, services) and
 * from the fetched page (its title).
 */
import { describe, expect, it } from 'vitest';

import { findComplianceIssues } from './compliance';
import { renderCalendarCsv, renderChecklistMarkdown, renderReviewMarkdown } from './downloads';
import { buildLocalSearchChecklist } from './local-search-checklist';
import { reviewWebsite, sanitizeVoice } from './site-review';
import { assembleCalendar } from './social-calendar';

const hostileVoice = {
  businessName: 'Guaranteed Results Plumbing',
  trade: 'Number one plumbing',
  town: 'Best in town Mackay',
  services: 'Earn $500 a week drain cleaning',
};

const hostileHtml =
  '<html><head><title>The best plumber in Mackay, 100% satisfaction</title></head><body><img src="a.jpg"></body></html>';

describe('member-visible copy from hostile inputs', () => {
  it('sanitizeVoice replaces any input that carries a claim with a neutral value', () => {
    const v = sanitizeVoice(hostileVoice);
    for (const value of Object.values(v)) expect(findComplianceIssues(value)).toEqual([]);
  });

  it('review, checklist, calendar and all downloads pass the filter, and the calendar has 30 posts', () => {
    for (const html of [hostileHtml, null]) {
      const review = reviewWebsite({
        websiteUrl: 'http://x.test/',
        fetch: html
          ? { ok: true, status: 200, html }
          : { ok: false, status: 0, html: null, error: 'guaranteed failure' },
        googleBusinessUrl: null,
        voice: hostileVoice,
      });
      const checklist = buildLocalSearchChecklist(review, hostileVoice);
      const calendar = assembleCalendar([], hostileVoice, new Date('2026-11-09T00:00:00Z'));
      expect(calendar.posts).toHaveLength(30);

      const visible = [
        review.summary,
        ...review.fixes.flatMap((f) => [f.title, f.why, f.how]),
        ...review.checks.map((c) => c.label),
        ...checklist.flatMap((i) => [i.label, i.detail]),
        ...calendar.posts.flatMap((p) => [p.theme, p.caption, p.hashtags.join(' ')]),
        renderReviewMarkdown(review, hostileVoice, '2026-11-09T00:00:00Z'),
        renderChecklistMarkdown(checklist, hostileVoice, '2026-11-09T00:00:00Z'),
        renderCalendarCsv(calendar),
      ];
      for (const line of visible) expect(findComplianceIssues(line), line).toEqual([]);
    }
  });
});
