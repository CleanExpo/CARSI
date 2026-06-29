import { describe, expect, it } from 'vitest';

import { stripLegacyPurchaseCta } from './format-course-body';

describe('stripLegacyPurchaseCta', () => {
  const TOPICS = '<p>Topics covered include:</p>\n<ul><li>Intro</li></ul>';

  it('strips the <h3> "Already Purchased" → "Access Here" lead block', () => {
    const raw =
      '<h3>Already Purchased This Course?</h3>\n' +
      '<p><a href="https://carsi.com.au/courses/x/"><br />\nAccess Here<br />\n</a></p>\n' +
      TOPICS;
    const out = stripLegacyPurchaseCta(raw);
    expect(out).not.toContain('Already Purchased');
    expect(out).not.toContain('Access Here');
    expect(out.startsWith('<p>Topics covered include:')).toBe(true);
  });

  it('strips the <h2> heading variant (real export uses both h2 and h3)', () => {
    const raw =
      '<h2>Already Purchased This Course?</h2>\n' +
      '<p><a href="https://carsi.com.au/courses/antiques/"><br />\nAccess Here<br />\n</a></p>\n' +
      TOPICS;
    const out = stripLegacyPurchaseCta(raw);
    expect(out).not.toContain('Already Purchased');
    expect(out).not.toContain('Access Here');
    expect(out.startsWith('<p>Topics covered include:')).toBe(true);
  });

  it('tolerates trailing whitespace in the heading and tabbed paragraph markup', () => {
    const raw =
      '<h3>Already Purchased This Course? </h3>\n' +
      '<p>\t\t\t\t\t<a href="https://carsi.com.au/courses/y/"><br />\n\t\t\t\t\tAccess Here<br />\n\t\t\t\t\t</a></p>\n' +
      TOPICS;
    const out = stripLegacyPurchaseCta(raw);
    expect(out).not.toContain('Already Purchased');
    expect(out.startsWith('<p>Topics covered include:')).toBe(true);
  });

  it('leaves a clean description untouched', () => {
    const clean = '<p>This course covers structural drying fundamentals.</p>';
    expect(stripLegacyPurchaseCta(clean)).toBe(clean);
  });

  it('is a no-op on empty / nullish input', () => {
    expect(stripLegacyPurchaseCta('')).toBe('');
  });
});
