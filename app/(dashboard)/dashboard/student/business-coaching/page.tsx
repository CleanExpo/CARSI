import type { Metadata } from 'next';

import { BusinessCoachingPortalClient } from '@/components/dashboard/BusinessCoachingPortalClient';
import { carsiCoachingProductName } from '@/lib/marketing/carsi-coaching-monthly';

export const metadata: Metadata = {
  title: `${carsiCoachingProductName} Portal`,
  robots: { index: false, follow: false },
};

export default function BusinessCoachingPortalPage() {
  return <BusinessCoachingPortalClient />;
}
