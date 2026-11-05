import { CoachingMarketingPackPage } from '@/components/coaching-portal/CoachingMarketingPackPage';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const generateMetadata = () => coachingRouteMetadata('marketing');

export default function Page() {
  return <CoachingMarketingPackPage />;
}
