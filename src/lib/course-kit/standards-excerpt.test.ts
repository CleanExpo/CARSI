import { describe, expect, it } from 'vitest';

import { scanManyForStandardExcerpts, scanTextForStandardExcerpt } from './standards-excerpt';

const PAD =
  'Water damage restoration work follows a structured assessment, drying and verification ' +
  'process across affected materials and assemblies in the built environment. ';

describe('scanTextForStandardExcerpt', () => {
  it('flags clause-numbered text that names an IICRC standard (cite-density)', () => {
    const text =
      PAD +
      'Per ANSI/IICRC S500 the restorer shall establish drying goals. See 12.3.4, 12.3.5 and ' +
      '10.6.2 for psychrometric requirements. The restorer shall document readings daily and ' +
      'shall verify the drying goal before demobilisation. ' +
      PAD;
    const hit = scanTextForStandardExcerpt(text, 'lesson-1');
    expect(hit).not.toBeNull();
    expect(hit?.where).toBe('lesson-1');
    expect(hit?.reason).toContain('verbatim');
  });

  it('flags Section-cited text with repeated normative shall language', () => {
    const text =
      PAD +
      'IICRC S520 Section 4.2 requires that the remediator shall contain the affected area, ' +
      'shall establish pressure differentials per Section 5.1, and shall verify by Section 7.3. ' +
      PAD;
    expect(scanTextForStandardExcerpt(text)).not.toBeNull();
  });

  it('allows a brief nominative reference to a standard', () => {
    const text =
      PAD +
      'This course is aligned to the principles of ANSI/IICRC S500:2021 as applied in the ' +
      'Australian regulatory context (Safe Work Australia, AS/NZS requirements). ' +
      PAD;
    expect(scanTextForStandardExcerpt(text)).toBeNull();
  });

  it('ignores clause-like numbering when no standard is mentioned', () => {
    const text =
      PAD +
      'Mix at 1.2.3 ratios and check gauges at 4.5.6 intervals; record 7.8.9 in the site log. ' +
      PAD;
    expect(scanTextForStandardExcerpt(text)).toBeNull();
  });

  it('ignores measurement decimals — they are not clause numbers', () => {
    const text =
      PAD +
      'Aligned to ANSI/IICRC S500. Use 2.5 m spacing, 1.5 L per m² and 3.5 air changes per hour ' +
      'when configuring drying equipment on a 230 V circuit. ' +
      PAD;
    expect(scanTextForStandardExcerpt(text)).toBeNull();
  });

  it('skips short blurbs entirely', () => {
    expect(scanTextForStandardExcerpt('IICRC S500 12.3.4 12.3.5 10.6.2 shall shall shall')).toBeNull();
  });
});

describe('scanManyForStandardExcerpts', () => {
  it('aggregates hits with locators', () => {
    const bad =
      PAD +
      'ANSI/IICRC S500: the restorer shall inspect per 12.3.4, shall record per 12.3.5 and ' +
      'shall verify per 10.6.2. ' +
      PAD;
    const hits = scanManyForStandardExcerpts([
      { text: PAD, where: 'a' },
      { text: bad, where: 'b' },
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0].where).toBe('b');
  });
});
