import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CoachingProgressPage } from '@/components/coaching-portal/CoachingAccountability';
import { isCarsiCoachingAccountabilityEnabled } from '@/lib/server/carsi-coaching-accountability-flag';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Progress and check-ins',
  robots: { index: false, follow: false },
};

/** GP-635. Does not exist (404) while CARSI_COACHING_ACCOUNTABILITY_ENABLED is off. */
export default function Page() {
  if (!isCarsiCoachingAccountabilityEnabled()) notFound();
  return <CoachingProgressPage />;
}
