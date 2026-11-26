import type { Metadata } from 'next';

import { DashboardLearningSection } from '@/components/dashboard/DashboardLearningSection';
import {
  getLearnerDashboardSummary,
  getResumeSnapshotForStudent,
} from '@/lib/server/learner-dashboard-data';
import { getLearnerLevelPayload } from '@/lib/server/learner-xp';
import { listOnboardingProgramsForUser } from '@/lib/server/onboarding-programs';
import { getLearnerLearningJourney } from '@/lib/server/learner-learning-journey';
import { getRenewalSummaryForStudent } from '@/lib/server/renewal-summary';
import type { LearnerLearningJourneyPayload } from '@/types/learner-learning-journey';
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
  // One renewal summary feeds both the CEC card (cycle-aware, GP-655) and the suggestions, which
  // getNextCourseRecommendationsForStudent read from this same summary.
  const renewal = userId && dbConfigured ? await getRenewalSummaryForStudent(userId) : null;
  const recommendations = renewal?.suggested_courses ?? [];
  let learningJourney: LearnerLearningJourneyPayload | null = null;
  if (userId && dbConfigured) {
    try {
      learningJourney = await getLearnerLearningJourney(userId);
    } catch {
      learningJourney = null;
    }
  }
  let streakDays = 0;
  if (userId && dbConfigured) {
    try {
      streakDays = (await getLearnerLevelPayload(userId)).current_streak;
    } catch {
      streakDays = 0;
    }
  }

  return (
    <DashboardLearningSection
      claims={claims}
      summary={summary}
      resume={resume}
      recommendations={recommendations}
      onboardingPrograms={onboardingPrograms}
      dbConfigured={dbConfigured}
      enrolmentQueryFailed={enrolmentQueryFailed}
      streakDays={streakDays}
      renewal={renewal}
      learningJourney={learningJourney}
    />
  );
}
