/**
 * Admin review funnel (spec 2026-10-18 D13; release-gate finding P1-OPEN-ASKS-COUNTS-EXCLUDED-COURSES):
 * open asks use the same course rule as the ask itself, so onboarding programmes — never asked —
 * are never counted as open asks.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';

const m = vi.hoisted(() => ({
  count: vi.fn(),
  queryRaw: vi.fn(),
  courseFindMany: vi.fn(),
  reviewCount: vi.fn(),
  emailGroupBy: vi.fn(),
  eventGroupBy: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: { count: m.count },
    $queryRaw: m.queryRaw,
    lmsCourse: { findMany: m.courseFindMany },
    lmsCourseReview: { count: m.reviewCount },
    lmsReviewRequestEmail: { groupBy: m.emailGroupBy },
    lmsCourseReviewModerationEvent: { groupBy: m.eventGroupBy },
  },
}));

const { getReviewFunnelSummary } = await import('./review-summary');

beforeEach(() => {
  vi.clearAllMocks();
  m.count.mockResolvedValue(10);
  m.reviewCount.mockResolvedValue(0);
  m.emailGroupBy.mockResolvedValue([]);
  m.eventGroupBy.mockResolvedValue([
    { reason: 'spam_or_fake', ratingAtAction: 1, _count: { _all: 2 } },
    { reason: 'offensive', ratingAtAction: 5, _count: { _all: 1 } },
  ]);
});

describe('open asks match who is actually asked', () => {
  it('counts regular courses only, excluding onboarding by slug, category or meta brand', async () => {
    m.queryRaw.mockResolvedValue([
      { course_id: 'regular', count: 3 },
      { course_id: 'floor-care', count: 4 },
      { course_id: 'by-category', count: 5 },
      { course_id: 'by-meta', count: 6 },
    ]);
    m.courseFindMany.mockResolvedValue([
      { id: 'regular', slug: 'water-damage', category: 'Water Damage Restoration', meta: null },
      { id: 'floor-care', slug: 'floor-care-onboarding-operational-readiness', category: null, meta: null },
      { id: 'by-category', slug: 'induction', category: ONBOARDING_BRAND, meta: null },
      { id: 'by-meta', slug: 'acme', category: 'Cleaning', meta: { brand: ONBOARDING_BRAND } },
    ]);
    const s = await getReviewFunnelSummary();
    expect(s.open_asks).toBe(3);
    expect(m.courseFindMany.mock.calls[0]![0].select).toMatchObject({ slug: true, category: true, meta: true });
  });

  it('reports zero open asks without a course lookup when nobody is waiting', async () => {
    m.queryRaw.mockResolvedValue([]);
    const s = await getReviewFunnelSummary();
    expect(s.open_asks).toBe(0);
    expect(m.courseFindMany).not.toHaveBeenCalled();
  });

  it('reports hides by reason and star rating, lowest rating first', async () => {
    m.queryRaw.mockResolvedValue([]);
    const s = await getReviewFunnelSummary();
    expect(s.hides_by_reason_and_rating).toEqual([
      { reason: 'spam_or_fake', rating: 1, count: 2 },
      { reason: 'offensive', rating: 5, count: 1 },
    ]);
  });
});
