import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  lmsCourse: { findMany: vi.fn() },
  lmsEnrollment: { findMany: vi.fn() },
  lmsLessonProgress: { findMany: vi.fn() },
  lmsTeamMember: { count: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { listOnboardingProgramsForUser, programsVisibleToLearner } from './onboarding-programs';

/** The organisation programme as the listing reads it from the database. */
const FLOOR_CARE = {
  id: 'course-floor-care',
  slug: 'floor-care-onboarding-operational-readiness',
  title: 'CARSI Maintenance Company Onboarding — Floor care',
  shortDescription: null,
  category: 'CARSI Maintenance Company Onboarding',
  level: null,
  durationHours: null,
  meta: { pricing: { amountAud: 1295, billingCycle: 'monthly', gst: 'exclusive', seats: 'unlimited' } },
  modules: [],
};
const LEARNER = 'user-individual';

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.lmsCourse.findMany.mockResolvedValue([FLOOR_CARE]);
  prismaMock.lmsLessonProgress.findMany.mockResolvedValue([]);
});

describe('programsVisibleToLearner', () => {
  const rows = [{ slug: 'a', enrolled: false }, { slug: 'b', enrolled: true }];

  it('gives an individual with no team only the programmes they are enrolled in', () => {
    expect(programsVisibleToLearner(rows, { isTeamMember: false }).map((r) => r.slug)).toEqual(['b']);
  });

  it('gives an individual with no team and no enrolment nothing', () => {
    expect(programsVisibleToLearner([rows[0]], { isTeamMember: false })).toEqual([]);
  });

  it('gives a team member every programme', () => {
    expect(programsVisibleToLearner(rows, { isTeamMember: true }).map((r) => r.slug)).toEqual(['a', 'b']);
  });
});

describe('listOnboardingProgramsForUser', () => {
  it('returns nothing for an individual learner with no team and no enrolment (the organisation spotlight disappears)', async () => {
    prismaMock.lmsEnrollment.findMany.mockResolvedValue([]);
    prismaMock.lmsTeamMember.count.mockResolvedValue(0);
    await expect(listOnboardingProgramsForUser(LEARNER)).resolves.toEqual([]);
    expect(prismaMock.lmsTeamMember.count).toHaveBeenCalledWith({ where: { userId: LEARNER } });
  });

  it('returns the programme an individual is enrolled in, marked enrolled', async () => {
    prismaMock.lmsEnrollment.findMany.mockResolvedValue([{ id: 'enrol-1', courseId: FLOOR_CARE.id }]);
    prismaMock.lmsTeamMember.count.mockResolvedValue(0);
    const rows = await listOnboardingProgramsForUser(LEARNER);
    expect(rows.map((r) => [r.slug, r.enrolled, r.enrollmentId])).toEqual([
      [FLOOR_CARE.slug, true, 'enrol-1'],
    ]);
  });

  it('returns every programme to a team member, enrolled or not', async () => {
    prismaMock.lmsEnrollment.findMany.mockResolvedValue([]);
    prismaMock.lmsTeamMember.count.mockResolvedValue(1);
    const rows = await listOnboardingProgramsForUser('user-team-member');
    expect(rows.map((r) => [r.slug, r.enrolled])).toEqual([[FLOOR_CARE.slug, false]]);
  });

  it('positive control: before the gate, the same individual would have received the programme', async () => {
    prismaMock.lmsEnrollment.findMany.mockResolvedValue([]);
    prismaMock.lmsTeamMember.count.mockResolvedValue(0);
    // The rows the listing builds before the gate are what the spotlight used to receive.
    const ungated = programsVisibleToLearner([{ slug: FLOOR_CARE.slug, enrolled: false }], {
      isTeamMember: true,
    });
    expect(ungated).toHaveLength(1);
    await expect(listOnboardingProgramsForUser(LEARNER)).resolves.toHaveLength(0);
  });
});
