import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COACHING_CHAPTER_SLUG,
  resolveCoachingMemberCoach,
} from '@/lib/coaching-portal/coach-routing';
import {
  DEMO_US_CHAPTER_SLUG,
  formatChapterPriceLabel,
  getCoachingChapter,
  getCoachingChapterByCoachId,
} from '@/lib/coaching-portal/coaching-chapters';

describe('coaching chapters registry (GP-632)', () => {
  it('resolves default CARSI chapter with AUD pricing', () => {
    const c = getCoachingChapter(DEFAULT_COACHING_CHAPTER_SLUG);
    expect(c?.currency).toBe('AUD');
    expect(formatChapterPriceLabel(c!)).toContain('GST inclusive');
  });

  it('resolves demo US chapter without checkout', () => {
    const c = getCoachingChapter(DEMO_US_CHAPTER_SLUG);
    expect(c?.allowCheckout).toBe(false);
    expect(c?.currency).toBe('USD');
  });

  it('resolveCoachingMemberCoach picks chapter by slug and coach id', () => {
    const demo = getCoachingChapterByCoachId('coach-demo-us')!;
    const profile = resolveCoachingMemberCoach({
      chapterSlug: demo.slug,
      coachUserId: demo.coachUserId,
    });
    expect(profile.chapterSlug).toBe(DEMO_US_CHAPTER_SLUG);
    expect(profile.priceLabel).toContain('US$');
  });
});
