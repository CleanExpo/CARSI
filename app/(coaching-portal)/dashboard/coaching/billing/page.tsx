import { CoachingBillingPage } from '@/components/coaching-portal/CoachingModulePages';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const generateMetadata = () => coachingRouteMetadata('billing');

export default function Page() {
  return <CoachingBillingPage />;
}
