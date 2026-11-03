import { redirect } from 'next/navigation';

import { CoachDashboard } from '@/components/coaching-portal/CoachDashboard';
import { coachingCard, coachingMuted, coachingPage } from '@/components/coaching-portal/coaching-ui';
import { getCoachForViewer, listCoachMembers } from '@/lib/server/carsi-coaching-coaches';
import { getServerSessionClaims } from '@/lib/server/session-server';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const claims = await getServerSessionClaims();
  if (!claims) redirect('/login?next=/dashboard/coaching/coach');

  const coach = await getCoachForViewer(claims);
  if (!coach) {
    return (
      <div className={coachingPage}>
        <section className={coachingCard} data-testid="coach-dashboard-no-access">
          <p className={coachingMuted}>This page is for coaches. Your account is not set up as a coach.</p>
        </section>
      </div>
    );
  }

  const members = await listCoachMembers(coach);
  return (
    <CoachDashboard
      coach={{
        displayName: coach.displayName,
        chapterName: coach.chapterName,
        isDemo: coach.isDemo,
        brandColour: coach.brandColour,
        logoUrl: coach.logoUrl,
      }}
      members={members}
    />
  );
}
