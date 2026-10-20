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

import { renewalProgress } from '@/lib/renewal-progress';
import { RENEWAL_RULE_NOTE } from '@/types/renewal';
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

  it('follows the IICRC renewal rule: 14 CECs over the 4 years before the renewal date (GP-655)', async () => {
    // iicrc.org/iicrcfaqs (read 20/10/2026): "14 CECs (hours) every four years". IN_WINDOW was
    // completed 01/06/2025, 3.5 years before a 31/12/2028 renewal: inside a 4-year cycle, outside
    // the 3-year one this summary used before.
    h.user = { ...h.user, iicrcExpiryDate: new Date('2028-12-31T00:00:00Z') };
    const s = await getRenewalSummaryForStudent('user-1');
    expect(s!.cec_required).toBe(14);
    expect(s!.cycle_start).toBe('2024-12-31T00:00:00.000Z');
    expect(s!.cycle_end).toBe('2028-12-31T23:59:59.999Z');
    expect(s!.cec_earned_in_cycle).toBe(1);
  });

  it('a certificate re-issued inside the period does not move an older completion into it (GP-655)', async () => {
    // Independent review of 0974e6ae: the period used certificateIssuedAt before completedAt, and
    // regenerating a certificate re-stamps it, so old completions could read as "target reached".
    // Renewal 31/12/2030 → period from 31/12/2026. IN_WINDOW completed 01/06/2025 (credited, in
    // force), certificate re-issued 01/02/2027.
    h.user = { ...h.user, iicrcExpiryDate: new Date('2030-12-31T00:00:00Z') };
    h.enrolments = [
      {
        ...enrolment(IN_WINDOW, new Date('2025-06-01T00:00:00Z')),
        certificateIssuedAt: new Date('2027-02-01T00:00:00Z'),
      },
    ];
    const s = await getRenewalSummaryForStudent('user-1');
    expect(s!.cycle_start).toBe('2026-12-31T00:00:00.000Z');
    expect(s!.cec_earned_lifetime).toBe(1);
    expect(s!.cec_earned_in_cycle).toBe(0);
    expect(renewalProgress(s, 1).reached).toBe(false);
  });

  it('states the rule, including Master/Inspector (GP-655)', () => {
    // The rendered cards are covered in DashboardLearningSection.renewal.test.tsx; the two client
    // pages mount the same render-tested CecRenewalStatus (checked there).
    expect(RENEWAL_RULE_NOTE).toBe(
      'IICRC rule: 14 CECs every 4 years. Master and Inspector certifications need 14 every 2 years.'
    );
  });

  it('cycle total excludes in-cycle completions outside the approval window', async () => {
    // Cycle 31/12/2023 – 31/12/2027 holds all four completions; only IN_WINDOW was in force.
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
