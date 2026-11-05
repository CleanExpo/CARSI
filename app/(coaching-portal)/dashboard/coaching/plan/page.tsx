import { CoachingPlanPage } from '@/components/coaching-portal/CoachingModulePages';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const generateMetadata = () => coachingRouteMetadata('plan');

export default function Page() {
  return <CoachingPlanPage />;
}
