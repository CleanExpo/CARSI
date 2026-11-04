import { redirect } from 'next/navigation';

import { CoachingPortalShell } from '@/components/coaching-portal/CoachingPortalShell';
import { recordPortalVisit } from '@/lib/server/carsi-coaching-accountability';
import { isCarsiCoachingAccountabilityEnabled } from '@/lib/server/carsi-coaching-accountability-flag';
import { getAccountabilityStore } from '@/lib/server/carsi-coaching-accountability-store';
import { loadCoachingPortalDashboard } from '@/lib/server/carsi-coaching-portal-dashboard';
import { getServerSessionClaims } from '@/lib/server/session-server';

export const dynamic = 'force-dynamic';

export default async function CoachingPortalLayout({ children }: { children: React.ReactNode }) {
  const claims = await getServerSessionClaims();
  if (!claims) {
    redirect('/login?next=/dashboard/coaching');
  }

  const dashboard = await loadCoachingPortalDashboard(claims);

  // GP-677: any member portal page counts as a visit (at most once every 6 hours), so the
  // quiet clock is not reset only by Home and Progress. Subscribers only, the same as the
  // accountability API; a failed write never stops the page from loading.
  if (isCarsiCoachingAccountabilityEnabled() && dashboard.access.entitled) {
    await recordPortalVisit(getAccountabilityStore(), claims.sub, new Date()).catch(
      (err: unknown) => {
        console.warn('[coaching-accountability] visit not recorded', err);
      }
    );
  }

  return <CoachingPortalShell dashboard={dashboard}>{children}</CoachingPortalShell>;
}
