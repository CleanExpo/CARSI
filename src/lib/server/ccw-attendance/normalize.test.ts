import { describe, expect, it } from 'vitest';

import { normalizeBusiness, normalizeEmail, normalizeName } from './normalize';

/** AC#15(a) — the single normalization helper, reused by writes AND matching. */
describe('normalizeEmail', () => {
  it('lower-cases, trims and collapses whitespace', () => {
    expect(normalizeEmail('  Bob@Example.COM ')).toBe('bob@example.com');
    expect(normalizeEmail('a\t b@x.com')).toBe('a b@x.com');
  });

  it('does NOT strip dots or +tags (email is the exact login identity)', () => {
    expect(normalizeEmail('bob.smith+ccw@gmail.com')).toBe('bob.smith+ccw@gmail.com');
  });
});

describe('normalizeName', () => {
  it('lower-cases + collapses but preserves meaningful punctuation', () => {
    expect(normalizeName("  O'Brien-Smith  ")).toBe("o'brien-smith");
    expect(normalizeName('Jane   Doe')).toBe('jane doe');
  });
});

describe('normalizeBusiness', () => {
  it('maps punctuation to spaces + collapses, reconciling legal-suffix variants', () => {
    // Non-alphanumerics (comma, period, apostrophe) become a space, then collapse.
    expect(normalizeBusiness("Bob's Cleaning, Pty. Ltd.")).toBe('bob s cleaning pty ltd');
    // The same business written with different punctuation reconciles to one value.
    expect(normalizeBusiness("Bob's Cleaning, Pty. Ltd.")).toBe(normalizeBusiness("Bob's Cleaning Pty Ltd"));
    expect(normalizeBusiness('ACME   Restoration')).toBe('acme restoration');
  });

  it('returns empty string for punctuation-only input (no business to match on)', () => {
    expect(normalizeBusiness('  ,.-  ')).toBe('');
  });
});
