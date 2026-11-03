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
      const calendar = assembleCalendar(hostileVoice, new Date('2026-11-09T00:00:00Z'));
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

// Codex P1 (head 5dfe661f): a member's free-text profile can carry a promise no word filter
// recognises ("We will fix your mould issue"). Generated copy therefore uses controlled wording
// only: no business name, a trade label from a fixed list, and a town only if it is shaped like a
// place name.
describe('controlled voice', () => {
  const promise = 'We will fix your mould issue';
  const planted = {
    businessName: promise,
    trade: promise,
    town: 'We Fix Everything',
    services: promise,
  };

  it('never passes profile free text through: no name, no non-place town, trade as a fixed label', () => {
    // The planted sentence mentions mould, so it maps to the fixed label, never to its own words.
    expect(sanitizeVoice(planted)).toEqual({
      businessName: '',
      trade: 'mould remediation',
      town: '',
      services: '',
    });
    expect(sanitizeVoice({ ...planted, trade: 'We will sort it out', services: '' }).trade).toBe(
      ''
    );
  });

  it('keeps no town text and maps the trade to a fixed label', () => {
    expect(
      sanitizeVoice({
        businessName: 'Downs Carpet Care',
        trade: 'Carpet & upholstery',
        town: 'Toowoomba QLD 4350',
        services: 'Carpet cleaning, rug cleaning',
      })
    ).toEqual({
      businessName: '',
      trade: 'carpet and upholstery cleaning',
      town: '',
      services: '',
    });
  });

  it('no planted profile text reaches the review, checklist, calendar or downloads', () => {
    const review = reviewWebsite({
      websiteUrl: 'http://x.test/',
      fetch: { ok: true, status: 200, html: hostileHtml },
      googleBusinessUrl: null,
      voice: planted,
    });
    const checklist = buildLocalSearchChecklist(review, planted);
    const calendar = assembleCalendar(planted, new Date('2026-11-09T00:00:00Z'));
    const everything = [
      review.summary,
      ...review.fixes.flatMap((f) => [f.title, f.why, f.how]),
      ...checklist.flatMap((i) => [i.label, i.detail]),
      renderReviewMarkdown(review, planted, '2026-11-09T00:00:00Z'),
      renderChecklistMarkdown(checklist, planted, '2026-11-09T00:00:00Z'),
      renderCalendarCsv(calendar),
    ].join('\n');
    expect(calendar.posts).toHaveLength(30);
    expect(everything.toLowerCase()).not.toContain('fix your mould');
    expect(everything.toLowerCase()).not.toContain('fix everything');
  });
});

// Codex P1 (head 32d27443): a town of "MouldFree" is shaped like a place name but is a claim. No
// shape or word check can tell the two apart, so no member-typed or page-fetched text is ever
// displayed: generated copy is fixed wording plus the fixed trade labels only.
describe('no member or page text is ever displayed', () => {
  const planted = {
    businessName: 'Qzbizname Plumbing',
    trade: 'Qztradeword plumbing',
    town: 'MouldFree',
    services: 'Qzservice drains',
  };
  const plantedHtml =
    '<html><head><title>Qzpagetitle MouldFree</title></head><body><h1>Qzheading</h1></body></html>';

  it('review, checklist, calendar and every download contain none of it', () => {
    const review = reviewWebsite({
      websiteUrl: 'https://qzurlword.test/',
      fetch: { ok: true, status: 200, html: plantedHtml, finalUrl: 'https://qzurlword.test/' },
      googleBusinessUrl: 'https://qzgbpword.test/',
      voice: planted,
    });
    const checklist = buildLocalSearchChecklist(review, planted);
    const calendar = assembleCalendar(planted, new Date('2026-11-09T00:00:00Z'));
    const everything = [
      review.summary,
      ...review.fixes.flatMap((f) => [f.title, f.why, f.how]),
      ...review.checks.map((c) => c.label),
      ...checklist.flatMap((i) => [i.label, i.detail]),
      ...calendar.posts.flatMap((p) => [p.theme, p.caption, p.hashtags.join(' ')]),
      renderReviewMarkdown(review, planted, '2026-11-09T00:00:00Z'),
      renderChecklistMarkdown(checklist, planted, '2026-11-09T00:00:00Z'),
      renderCalendarCsv(calendar),
    ]
      .join('\n')
      .toLowerCase();
    expect(calendar.posts).toHaveLength(30);
    for (const token of [
      'mouldfree',
      'qzbizname',
      'qztradeword',
      'qzservice',
      'qzpagetitle',
      'qzheading',
      'qzurlword',
      'qzgbpword',
    ]) {
      expect(everything, token).not.toContain(token);
    }
  });
});
