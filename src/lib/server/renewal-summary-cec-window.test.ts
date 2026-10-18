import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Licence-critical: the renewal summary (`/api/lms/gamification/me/renewal-summary`) may credit
 * CEC for a completed course only while its IICRC approval was in force at completion — on or
 * after `approvedAt` and before 00:00 UTC on `expiresAt` (data/seed/cec-approvals.json). A
 * suggested course may claim CEC only when its approval is in force now.
 */

// 2024-01-18 batch, lapses 2027-01-18.
const BEFORE_GRANT = 'introduction-to-porous-materials-drying';
const AFTER_LAPSE = 'introduction-to-odour-control-and-removal-techniques';
const IN_WINDOW = 'introduction-to-structural-drying-concepts';
const LAPSED_SUGGESTION = 'introduction-to-drying-techniques-and-equipment';
// 2025-05-15 batch, lapses 2028-05-15.
const CURRENT_BEFORE_GRANT = 'introduction-to-monitoring-air-quality-on-the-job-site';
const CURRENT_SUGGESTION = 'introduction-to-air-quality-fundamentals';

const NOW = new Date('2027-03-01T00:00:00Z');

function enrolment(slug: string, done: Date) {
  return {
    status: 'completed',
    completedAt: done,
    certificateIssuedAt: null,
    course: {
      id: `c-${slug}`,
      slug,
      title: slug,
      description: null,
      shortDescription: null,
      thumbnailUrl: null,
      status: 'published',
      isPublished: true,
      cecHours: null,
      meta: null,
      iicrcDiscipline: null,
      modules: [{ lessons: [{ id: `l-${slug}` }] }],
    },
  };
}

function candidate(slug: string) {
  const { modules: _modules, ...course } = enrolment(slug, NOW).course;
  return course;
}

const h = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
  enrolments: [] as unknown[],
  candidates: [] as unknown[],
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: vi.fn(async () => h.user) },
    lmsEnrollment: { findMany: vi.fn(async () => h.enrolments) },
    lmsLessonProgress: { findMany: vi.fn(async () => []) },
    lmsCourse: { findMany: vi.fn(async () => h.candidates) },
  },
}));

import { getRenewalSummaryForStudent } from './renewal-summary';

describe('renewal summary credits CEC only inside the approval window', () => {
  const savedDbUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.DATABASE_URL = 'postgres://test';
    h.user = { iicrcMemberNumber: null, iicrcExpiryDate: null, onboarding: null };
    h.enrolments = [
      enrolment(BEFORE_GRANT, new Date('2024-01-10T00:00:00Z')),
      enrolment(AFTER_LAPSE, new Date('2027-01-19T00:00:00Z')),
      enrolment(CURRENT_BEFORE_GRANT, new Date('2025-05-01T00:00:00Z')),
      enrolment(IN_WINDOW, new Date('2025-06-01T00:00:00Z')),
    ];
    h.candidates = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.DATABASE_URL = savedDbUrl;
  });

  it('lifetime total excludes completions before approvedAt and after expiresAt', async () => {
    const s = await getRenewalSummaryForStudent('user-1');
    expect(s).not.toBeNull();
    expect(s!.cec_earned_lifetime).toBe(1);
    expect(s!.cec_earned_in_cycle).toBe(1);
    expect(s!.by_discipline_lifetime).toEqual({ General: 1 });
  });

  it('cycle total excludes in-cycle completions outside the approval window', async () => {
    // Cycle 31/12/2024 – 31/12/2027 holds AFTER_LAPSE, CURRENT_BEFORE_GRANT and IN_WINDOW.
    h.user = { ...h.user, iicrcExpiryDate: new Date('2027-12-31T00:00:00Z') };
    const s = await getRenewalSummaryForStudent('user-1');
    expect(s!.tracking_mode).toBe('cycle');
    expect(s!.cec_earned_in_cycle).toBe(1);
    expect(s!.by_discipline).toEqual({ General: 1 });
    expect(s!.cec_earned_lifetime).toBe(1);
  });

  it('a suggestion claims CEC only when its approval is in force now', async () => {
    h.enrolments = [];
    h.candidates = [candidate(LAPSED_SUGGESTION), candidate(CURRENT_SUGGESTION)];
    const s = await getRenewalSummaryForStudent('user-1');
    const bySlug = new Map(s!.suggested_courses.map((c) => [c.slug, c]));
    expect(bySlug.get(CURRENT_SUGGESTION)?.cec_hours).toBe(1);
    expect(bySlug.get(CURRENT_SUGGESTION)?.reason).toMatch(/CEC/);
    expect(bySlug.get(LAPSED_SUGGESTION)?.cec_hours).toBeNull();
    expect(bySlug.get(LAPSED_SUGGESTION)?.reason).not.toMatch(/CEC/);
  });
});
