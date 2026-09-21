import type { Metadata } from 'next';

import { DashboardLearningSection } from '@/components/dashboard/DashboardLearningSection';
import {
  getLearnerDashboardSummary,
  getResumeSnapshotForStudent,
} from '@/lib/server/learner-dashboard-data';
import { listOnboardingProgramsForUser } from '@/lib/server/onboarding-programs';
import { getNextCourseRecommendationsForStudent } from '@/lib/server/renewal-summary';
import { getServerSessionClaims } from '@/lib/server/session-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Home | CARSI Learning',
  description: 'Continue learning, track progress, and find your next course.',
};

export default async function DashboardPage() {
  const claims = await getServerSessionClaims();
  const dbConfigured = Boolean(process.env.DATABASE_URL?.trim());
  const userId = claims?.sub;
  const summary = userId && dbConfigured ? await getLearnerDashboardSummary(userId) : null;
  const enrolmentQueryFailed = Boolean(userId && dbConfigured && summary === null);
  const onboardingPrograms =
    userId && dbConfigured ? await listOnboardingProgramsForUser(userId) : [];
  const resume = userId && dbConfigured ? await getResumeSnapshotForStudent(userId) : null;
  const recommendations =
    userId && dbConfigured ? await getNextCourseRecommendationsForStudent(userId) : [];

  return (
    <DashboardLearningSection
      claims={claims}
      summary={summary}
      resume={resume}
      recommendations={recommendations}
      onboardingPrograms={onboardingPrograms}
      dbConfigured={dbConfigured}
      enrolmentQueryFailed={enrolmentQueryFailed}
    />
  );
}
