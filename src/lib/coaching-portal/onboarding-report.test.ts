import { describe, expect, it } from 'vitest';

import { emptyAssessmentResponses } from '@/lib/coaching-portal/assessment-schema';
import { EMPTY_COACHING_BUSINESS_PROFILE } from '@/lib/coaching-portal/business-profile';
import { buildOnboardingReportPlainText } from '@/lib/coaching-portal/onboarding-report';

describe('buildOnboardingReportPlainText', () => {
  it('includes profile, assessment, and member statements', () => {
    const text = buildOnboardingReportPlainText({
      member: { fullName: 'Jane Doe', email: 'jane@example.com' },
      profile: {
        ...EMPTY_COACHING_BUSINESS_PROFILE,
        businessName: 'Acme Wash',
        mainServices: 'Pressure washing',
      },
      assessmentResponses: {
        ...emptyAssessmentResponses(),
        owner_role: 'Owner-operator',
      },
      statements: {
        problemStatement: 'Not enough leads in winter.',
        goalStatement: 'Steady $30k months year-round.',
        extraNotes: '',
      },
      submittedAtIso: '2026-10-10T00:00:00.000Z',
    });
    expect(text).toContain('Acme Wash');
    expect(text).toContain('Owner-operator');
    expect(text).toContain('Not enough leads in winter.');
    expect(text).toContain('Steady $30k months');
  });
});
