import { redirect } from 'next/navigation';

import { CoachingPortalShell } from '@/components/coaching-portal/CoachingPortalShell';
import { loadCoachingPortalDashboard } from '@/lib/server/carsi-coaching-portal-dashboard';
import { getServerSessionClaims } from '@/lib/server/session-server';

export const dynamic = 'force-dynamic';

export default async function CoachingPortalLayout({ children }: { children: React.ReactNode }) {
  const claims = await getServerSessionClaims();
  if (!claims) {
    redirect('/login?next=/dashboard/coaching');
  }

  const dashboard = await loadCoachingPortalDashboard(claims);

  return <CoachingPortalShell dashboard={dashboard}>{children}</CoachingPortalShell>;
}
