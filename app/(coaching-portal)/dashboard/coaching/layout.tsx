import { redirect } from 'next/navigation';

import { CoachProvider } from '@/components/coaching-portal/CoachContext';
import { CoachingPortalShell } from '@/components/coaching-portal/CoachingPortalShell';
import { getPortalCoachForMember } from '@/lib/server/carsi-coaching-coaches';
import { loadCoachingPortalDashboard } from '@/lib/server/carsi-coaching-portal-dashboard';
import { getServerSessionClaims } from '@/lib/server/session-server';

export const dynamic = 'force-dynamic';

export default async function CoachingPortalLayout({ children }: { children: React.ReactNode }) {
  const claims = await getServerSessionClaims();
  if (!claims) {
    redirect('/login?next=/dashboard/coaching');
  }

  const [dashboard, coach] = await Promise.all([
    loadCoachingPortalDashboard(claims),
    getPortalCoachForMember(claims.sub),
  ]);

  return (
    <CoachProvider coach={coach}>
      <CoachingPortalShell dashboard={dashboard}>{children}</CoachingPortalShell>
    </CoachProvider>
  );
}
