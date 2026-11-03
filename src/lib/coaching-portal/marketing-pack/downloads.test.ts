import { describe, expect, it } from 'vitest';

import { renderCalendarCsv, renderReviewMarkdown } from './downloads';
import { assembleCalendar } from './social-calendar';
import { reviewWebsite } from './site-review';

const voice = {
  businessName: 'Downs Carpet Care',
  trade: 'Carpet',
  town: 'Toowoomba',
  services: '',
};

describe('marketing pack downloads', () => {
  it('calendar CSV has a header and 30 rows and neutralises formula cells', () => {
    const calendar = assembleCalendar(
      [
        {
          theme: '=HYPERLINK("x")',
          caption: 'Toowoomba tip: blot, "never" rub.',
          hashtags: ['#Tip'],
        },
      ],
      voice,
      new Date('2026-11-09T00:00:00Z')
    );
    const csv = renderCalendarCsv(calendar);
    const rows = csv.replace(/^﻿/, '').trim().split('\r\n');
    expect(rows).toHaveLength(31);
    expect(rows[1]).toContain(`"'=HYPERLINK(""x"")"`);
    expect(rows[1]).toContain('"Toowoomba tip: blot, ""never"" rub."');
  });

  it('review markdown lists ranked fixes', () => {
    const review = reviewWebsite({ websiteUrl: null, fetch: null, googleBusinessUrl: null, voice });
    const md = renderReviewMarkdown(review, voice, '2026-11-09T00:00:00Z');
    expect(md).toContain('### 1. ');
    expect(md).toContain('Downs Carpet Care, Toowoomba');
  });
});
