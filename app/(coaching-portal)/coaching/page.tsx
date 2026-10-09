import type { Metadata } from 'next';

import { CoachingPortalHome } from '@/components/coaching-portal/CoachingPortalHome';
import { carsiCoachingProductName } from '@/lib/marketing/carsi-coaching-monthly';

export const metadata: Metadata = {
  title: `${carsiCoachingProductName} Workspace`,
  robots: { index: false, follow: false },
};

export default function CoachingPortalHomePage() {
  return <CoachingPortalHome />;
}
