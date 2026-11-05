import { describe, expect, it } from 'vitest';

import { authorityForNavItems, authorityPageLatestVerified } from './authority-for-nav';
import { authorityPages } from './authority-pages';

describe('authority-for-nav', () => {
  it('lists every registry slug once', () => {
    expect(authorityForNavItems.map((i) => i.slug).sort()).toEqual(
      authorityPages.map((p) => p.slug).sort()
    );
    expect(new Set(authorityForNavItems.map((i) => i.href)).size).toBe(authorityPages.length);
  });

  it('picks the latest claim verification date', () => {
    const entry = authorityPages[0];
    const latest = authorityPageLatestVerified(entry);
    for (const claim of entry.claims) {
      expect(latest >= claim.lastVerified).toBe(true);
    }
  });
});
