import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HomeGrowthSection } from './HomeGrowthSection';

const BRISBANE = [{ city: 'Brisbane', startsOn: '2026-09-04', endsOn: '2026-09-05' }];
const DAY_RANGE = /\b\d{1,2} to \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;

function renderedText(stops: typeof BRISBANE): string {
  return renderToStaticMarkup(createElement(HomeGrowthSection, { stops }))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

describe('HomeGrowthSection', () => {
  it('prints each upcoming stop with dates derived from its ISO days', () => {
    const text = renderedText(BRISBANE);
    expect(text).toContain('Brisbane');
    expect(text).toContain('4 to 5 Sep');
    expect(text).not.toContain('No upcoming dates listed');
  });

  it('prints the factual fallback row and no date when no stop is upcoming', () => {
    const text = renderedText([]);
    expect(text).toContain('No upcoming dates listed');
    expect(text).not.toMatch(DAY_RANGE);
    expect(text).not.toContain('Brisbane');
  });

  it('never prints the July stops or the retired free-entry line', () => {
    for (const stops of [BRISBANE, []]) {
      const text = renderedText(stops);
      expect(text).not.toMatch(/\bJul\b/);
      expect(text).not.toContain('Melbourne');
      expect(text).not.toContain('Sydney');
      expect(text).not.toMatch(/free entry/i);
      expect(text).toContain('Admit one · Seats capped per city');
    }
  });

  it('positive control: the pre-fix ticket copy fails the same checks', () => {
    expect('Melbourne 22 to 23 Jul').toMatch(DAY_RANGE);
    expect('Melbourne 22 to 23 Jul').toMatch(/\bJul\b/);
    expect('Admit one · Free entry for CCW customers').toMatch(/free entry/i);
  });
});
