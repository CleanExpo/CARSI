import { describe, expect, it } from 'vitest';

import { emptyAssessmentResponses } from '@/lib/coaching-portal/assessment-schema';
import { PARTNER_DEMO_ASSESSMENT_ANSWERS } from '@/lib/coaching-portal/partner-demo';
import {
  DEFAULT_GAP_COURSE_MAP,
  applyCoachPathAdjustment,
  detectAssessmentGaps,
  learningGoalId,
  parseLearningGoalId,
  recommendLearningModules,
  rollupLearningProgress,
  type LearningCatalogueCourse,
} from '@/lib/coaching-portal/learning-path';

/** A member who markets by word of mouth only, has no website or Google profile, and says so. */
function marketingGapFixture() {
  return {
    ...emptyAssessmentResponses(),
    owner_role: 'Owner and lead technician',
    lead_sources: 'Word of mouth and a few repeat insurance jobs',
    marketing_efforts: 'Nothing really',
    website_url: '',
    google_business_url: '',
    enquiry_process: 'I answer the phone when I can',
    conversion_challenges: 'Not many enquiries to start with',
    ops_strengths: 'Drying jobs are run well',
    ops_pain: 'Not much',
    tools_used: 'Xero and a job app',
    automation_interest: '',
    profitability: 'Modest profit',
    top_priorities: 'Get more leads, get found on Google, build a website',
    success_12m: 'Steady enquiries every week',
  };
}

const CATALOGUE: LearningCatalogueCourse[] = [
  { id: 'c-social', slug: 'social-media-marketing', title: 'Social Media Marketing' },
  {
    id: 'c-wd-mkt',
    slug: 'introduction-to-water-damage-marketing-and-sales',
    title: 'Introduction to Water Damage Marketing and Sales',
  },
  {
    id: 'c-estimating',
    slug: 'introduction-to-water-damage-estimating',
    title: 'Introduction to Water Damage Estimating',
  },
  { id: 'c-admin', slug: 'admin-sole-trader', title: 'Admin for Sole Traders' },
  {
    id: 'c-pm',
    slug: 'introduction-to-project-management-for-water-losses',
    title: 'Introduction to Project Management for Water Losses',
  },
  { id: 'c-ai', slug: 'agi-essentials-small-business', title: 'AI Essentials for Small Business' },
];

describe('detectAssessmentGaps', () => {
  it('ranks marketing first for a word-of-mouth-only member with no web presence', () => {
    const gaps = detectAssessmentGaps(marketingGapFixture());
    expect(gaps[0]?.area).toBe('marketing');
    expect(gaps[0]?.reasons.length).toBeGreaterThan(0);
    // Ranked strictly by score, highest first.
    for (let i = 1; i < gaps.length; i += 1) {
      expect(gaps[i - 1].score).toBeGreaterThanOrEqual(gaps[i].score);
    }
  });

  it('returns no gaps for an empty assessment (absence of answers is not a gap signal)', () => {
    expect(detectAssessmentGaps(emptyAssessmentResponses())).toEqual([]);
  });

  it('flags money when profitability is under pressure and the member names cash flow', () => {
    const gaps = detectAssessmentGaps({
      ...emptyAssessmentResponses(),
      profitability: 'Under pressure',
      top_priorities: 'Fix cash flow and pricing',
    });
    expect(gaps.map((g) => g.area)).toContain('money');
  });
});

describe('recommendLearningModules', () => {
  it('turns the marketing fixture into the two marketing modules first, in map order', () => {
    const mods = recommendLearningModules({
      gaps: detectAssessmentGaps(marketingGapFixture()),
      courseMap: DEFAULT_GAP_COURSE_MAP,
      catalogue: CATALOGUE,
      completedCourseIds: new Set(),
    });
    expect(mods.slice(0, 2).map((m) => m.slug)).toEqual([
      'social-media-marketing',
      'introduction-to-water-damage-marketing-and-sales',
    ]);
    expect(mods[0]).toMatchObject({ courseId: 'c-social', area: 'marketing', rank: 1 });
  });

  it('never lists a course twice even when two gaps map to it', () => {
    const mods = recommendLearningModules({
      gaps: [
        { area: 'marketing', score: 5, reasons: ['x'] },
        { area: 'sales', score: 4, reasons: ['y'] },
      ],
      courseMap: DEFAULT_GAP_COURSE_MAP,
      catalogue: CATALOGUE,
      completedCourseIds: new Set(),
    });
    const slugs = mods.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(
      slugs.filter((s) => s === 'introduction-to-water-damage-marketing-and-sales')
    ).toHaveLength(1);
    expect(mods.map((m) => m.rank)).toEqual(mods.map((_, i) => i + 1));
  });

  it('skips modules the member has already completed', () => {
    const mods = recommendLearningModules({
      gaps: [{ area: 'marketing', score: 5, reasons: ['x'] }],
      courseMap: DEFAULT_GAP_COURSE_MAP,
      catalogue: CATALOGUE,
      completedCourseIds: new Set(['c-social']),
    });
    expect(mods.map((m) => m.slug)).toEqual(['introduction-to-water-damage-marketing-and-sales']);
  });

  it('skips mapped slugs that are not in the live published catalogue (fail closed)', () => {
    const mods = recommendLearningModules({
      gaps: [{ area: 'marketing', score: 5, reasons: ['x'] }],
      courseMap: DEFAULT_GAP_COURSE_MAP,
      catalogue: CATALOGUE.filter((c) => c.slug !== 'social-media-marketing'),
      completedCourseIds: new Set(),
    });
    expect(mods.map((m) => m.slug)).toEqual(['introduction-to-water-damage-marketing-and-sales']);
  });

  it('caps the path at the limit', () => {
    const mods = recommendLearningModules({
      gaps: [
        { area: 'marketing', score: 5, reasons: ['x'] },
        { area: 'sales', score: 4, reasons: ['x'] },
        { area: 'money', score: 3, reasons: ['x'] },
        { area: 'operations', score: 3, reasons: ['x'] },
        { area: 'technology', score: 2, reasons: ['x'] },
      ],
      courseMap: DEFAULT_GAP_COURSE_MAP,
      catalogue: CATALOGUE,
      completedCourseIds: new Set(),
      limit: 3,
    });
    expect(mods).toHaveLength(3);
  });
});

describe('learning goal ids', () => {
  it('round-trips a course id and rejects anything else', () => {
    const id = '5b3c2a8e-1d0f-4f4e-9c55-0d3b8f0f6a11';
    expect(parseLearningGoalId(learningGoalId(id))).toBe(id);
    expect(parseLearningGoalId(null)).toBeNull();
    expect(parseLearningGoalId('goal-1')).toBeNull();
    expect(parseLearningGoalId('course:not-a-uuid')).toBeNull();
    expect(learningGoalId(id).length).toBeLessThanOrEqual(64);
  });
});

describe('rollupLearningProgress', () => {
  it('is to do with no enrolment and no lessons done', () => {
    expect(
      rollupLearningProgress({
        enrolled: false,
        completed: false,
        lessonsTotal: 10,
        lessonsCompleted: 0,
      })
    ).toEqual({ percent: 0, status: 'todo' });
  });

  it('is in progress part way through, rounding the percent', () => {
    expect(
      rollupLearningProgress({
        enrolled: true,
        completed: false,
        lessonsTotal: 3,
        lessonsCompleted: 1,
      })
    ).toEqual({ percent: 33, status: 'in_progress' });
  });

  it('is done when the LMS marks the enrolment complete, whatever the lesson count says', () => {
    expect(
      rollupLearningProgress({
        enrolled: true,
        completed: true,
        lessonsTotal: 10,
        lessonsCompleted: 4,
      })
    ).toEqual({ percent: 100, status: 'done' });
  });

  it('never reports done from lesson count alone and never divides by zero', () => {
    expect(
      rollupLearningProgress({
        enrolled: true,
        completed: false,
        lessonsTotal: 0,
        lessonsCompleted: 0,
      })
    ).toEqual({ percent: 0, status: 'in_progress' });
    expect(
      rollupLearningProgress({
        enrolled: true,
        completed: false,
        lessonsTotal: 4,
        lessonsCompleted: 4,
      })
    ).toEqual({ percent: 99, status: 'in_progress' });
  });
});

describe('applyCoachPathAdjustment', () => {
  const current = ['a', 'b', 'c'];

  it('removes, adds at the end without duplicates, and keeps order otherwise', () => {
    expect(applyCoachPathAdjustment(current, { remove: ['b'], add: ['d', 'a'] })).toEqual([
      'a',
      'c',
      'd',
    ]);
  });

  it('reorders to the coach order and keeps anything the order left out at the end', () => {
    expect(applyCoachPathAdjustment(current, { order: ['c', 'a'] })).toEqual(['c', 'a', 'b']);
  });

  it('ignores order entries that are not on the path', () => {
    expect(applyCoachPathAdjustment(current, { order: ['z', 'b'] })).toEqual(['b', 'a', 'c']);
  });
});

describe('partner demo member', () => {
  it('gets a sales-led path from the seeded assessment (follow-up and owner bottleneck gaps)', () => {
    const gaps = detectAssessmentGaps({
      ...emptyAssessmentResponses(),
      ...PARTNER_DEMO_ASSESSMENT_ANSWERS,
    });
    expect(gaps.map((g) => g.area)).toEqual(['sales', 'operations', 'technology']);
    const mods = recommendLearningModules({
      gaps,
      courseMap: DEFAULT_GAP_COURSE_MAP,
      catalogue: CATALOGUE,
      completedCourseIds: new Set(),
    });
    expect(mods.map((m) => m.slug)).toEqual([
      'introduction-to-water-damage-marketing-and-sales',
      'introduction-to-water-damage-estimating',
      'introduction-to-project-management-for-water-losses',
      'admin-sole-trader',
    ]);
  });
});
