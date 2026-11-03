import { describe, expect, it } from 'vitest';

import { buildHomeFaqs } from './home-faqs';

const ACRONYM_RE = /\b(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT|TCST)\b/;

describe('buildHomeFaqs (GP-654)', () => {
  it('never brands the catalogue with IICRC discipline counts or acronyms', () => {
    for (const n of [0, 1, 80]) {
      const text = buildHomeFaqs({ publishedCourseCount: n })
        .map((f) => f.answer)
        .join(' ');
      expect(text).not.toMatch(ACRONYM_RE);
      expect(/\b\d+\s*IICRC\s+disciplin/i.test(text)).toBe(false);
      expect(text).toContain('water damage restoration');
    }
  });
});
