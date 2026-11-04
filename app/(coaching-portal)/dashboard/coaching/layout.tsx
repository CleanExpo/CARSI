import { redirect } from 'next/navigation';

import { CoachingPortalShell } from '@/components/coaching-portal/CoachingPortalShell';
import { CoachingPortalVisitBeacon } from '@/components/coaching-portal/CoachingPortalVisitBeacon';
import { isCarsiCoachingAccountabilityEnabled } from '@/lib/server/carsi-coaching-accountability-flag';
import { loadCoachingPortalDashboard } from '@/lib/server/carsi-coaching-portal-dashboard';
import { getServerSessionClaims } from '@/lib/server/session-server';

export const dynamic = 'force-dynamic';

export default async function CoachingPortalLayout({ children }: { children: React.ReactNode }) {
  const claims = await getServerSessionClaims();
  if (!claims) {
    redirect('/login?next=/dashboard/coaching');
  }

  const dashboard = await loadCoachingPortalDashboard(claims);

  // GP-677: every member portal page counts as a visit (the server records at most one every
  // 6 hours), so the quiet clock is not reset only by Home and Progress. Subscribers only,
  // the same as the accountability API, and nothing at all while the feature flag is off.
  const trackVisits = isCarsiCoachingAccountabilityEnabled() && dashboard.access.entitled;

  return (
    <CoachingPortalShell dashboard={dashboard}>
      {trackVisits ? <CoachingPortalVisitBeacon /> : null}
      {children}
    </CoachingPortalShell>
  );
}
