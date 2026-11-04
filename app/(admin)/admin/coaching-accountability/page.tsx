import { notFound } from 'next/navigation';

import { AdminCoachingAccountabilityClient } from '@/components/admin/AdminCoachingAccountabilityClient';
import { isCarsiCoachingAccountabilityEnabled } from '@/lib/server/carsi-coaching-accountability-flag';

export const dynamic = 'force-dynamic';

/** GP-635 coach view. Does not exist (404) while CARSI_COACHING_ACCOUNTABILITY_ENABLED is off. */
export default function AdminCoachingAccountabilityPage() {
  if (!isCarsiCoachingAccountabilityEnabled()) notFound();
  return <AdminCoachingAccountabilityClient />;
}
