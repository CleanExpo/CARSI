/**
 * GP-776: only an IICRC CEC approval in force today exempts a course from the GP-748
 * no-IICRC/CEC wording rule. A register entry that is submitted, not submitted or expired
 * is not an approval.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../data/seed/cec-approvals.json', () => ({
  default: {
    approvals: [
      { slug: 'submitted-course', status: 'submitted', approvedHours: 1, expiresAt: '2999-01-01' },
      { slug: 'approved-course', status: 'approved', approvedHours: 1, expiresAt: '2999-01-01' },
    ],
  },
}));

import { evaluatePublishGate, type PublishGateCourse } from './course-publish-gate';

function course(slug: string): PublishGateCourse {
  return {
    slug,
    title: 'Water damage restoration',
    description: 'Follow the IICRC S500 drying goals.',
    shortDescription: null,
    thumbnailUrl: null,
    status: 'in_review',
    isPublished: false,
    modules: [],
    quizzes: [],
  };
}

const gp748 = (slug: string) =>
  evaluatePublishGate(course(slug), null).filter((b) => /not on the IICRC CEC approvals register/.test(b.message));

describe('GP-748 exemption needs an approval in force', () => {
  it('a submitted register entry does not exempt the course', () => {
    expect(gp748('submitted-course')).toHaveLength(1);
  });

  it('an approved register entry does exempt the course (positive control)', () => {
    expect(gp748('approved-course')).toHaveLength(0);
  });
});
