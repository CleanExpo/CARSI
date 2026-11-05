import type { Metadata } from 'next';

import { CoachingMarketingPackPage } from '@/components/coaching-portal/CoachingMarketingPackPage';

export const metadata: Metadata = {
  title: 'Marketing pack | CARSI Business Coaching',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CoachingMarketingPackPage />;
}
