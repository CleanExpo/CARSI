import type { Metadata } from 'next';

import { DashboardLearningSection } from '@/components/dashboard/DashboardLearningSection';
import { getLearnerDashboardSummary } from '@/lib/server/learner-dashboard-data';
import { listOnboardingProgramsForUser } from '@/lib/server/onboarding-programs';
import { getServerSessionClaims } from '@/lib/server/session-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard | CARSI Learning',
  description: 'Your learning overview and enrolments.',
};

export default async function DashboardPage() {
  const claims = await getServerSessionClaims();
  const dbConfigured = Boolean(process.env.DATABASE_URL?.trim());
  const summary = claims && dbConfigured ? await getLearnerDashboardSummary(claims.sub) : null;
  const enrolmentQueryFailed = Boolean(claims && dbConfigured && summary === null);
  const onboardingPrograms =
    claims && dbConfigured ? await listOnboardingProgramsForUser(claims.sub) : [];

  return (
    <DashboardLearningSection
      claims={claims}
      summary={summary}
      onboardingPrograms={onboardingPrograms}
      dbConfigured={dbConfigured}
      enrolmentQueryFailed={enrolmentQueryFailed}
    />
  );
}
