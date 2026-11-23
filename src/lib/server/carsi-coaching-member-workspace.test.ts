import { describe, expect, it } from 'vitest';

import { normalizeChapterSlug } from '@/lib/server/carsi-coaching-member-workspace';

describe('coaching member workspace (GP-632)', () => {
  it('accepts valid chapter slugs', () => {
    expect(normalizeChapterSlug('carsi-business-coaching')).toBe('carsi-business-coaching');
    expect(normalizeChapterSlug('  demo-us-chapter  ')).toBe('demo-us-chapter');
  });

  it('rejects invalid slugs', () => {
    expect(normalizeChapterSlug('')).toBeNull();
    expect(normalizeChapterSlug('Bad Slug')).toBeNull();
    expect(normalizeChapterSlug('a'.repeat(121))).toBeNull();
  });
});