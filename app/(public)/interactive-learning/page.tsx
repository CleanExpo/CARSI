import type { Metadata } from 'next';

import { InteractiveLearningHubView } from '@/components/lms/interactive/InteractiveLearningHubView';
import { listInteractiveLearningOffers } from '@/lib/lms/interactive-learning-catalog';

export const metadata: Metadata = {
  title: 'Interactive practice — explore CARSI courses by doing',
  description:
    'CARSI interactive learning advisor: live job-site scenarios and mastery practice across water, moisture, microbial, carpet, and indoor environment courses.',
  openGraph: {
    title: 'CARSI interactive practice',
    description: 'Investigate, decide, and practise — discipline by discipline.',
  },
};

export default function InteractiveLearningHubPage() {
  const offers = listInteractiveLearningOffers();
  return <InteractiveLearningHubView offers={offers} />;
}