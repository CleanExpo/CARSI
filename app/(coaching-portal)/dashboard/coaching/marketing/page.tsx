import type { Metadata } from 'next';

import { CoachingMarketingPackPage } from '@/components/coaching-portal/CoachingMarketingPackPage';

export const metadata: Metadata = {
  title: 'Marketing pack | CARSI Business Coaching',
  description:
    'Website and Google review, local-search checklist and a 30-day social calendar for your trade.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CoachingMarketingPackPage />;
}
