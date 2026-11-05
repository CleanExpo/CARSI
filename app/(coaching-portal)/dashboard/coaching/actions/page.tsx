import { CoachingActionsPage } from '@/components/coaching-portal/CoachingModulePages';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const generateMetadata = () => coachingRouteMetadata('actions');

export default function Page() {
  return <CoachingActionsPage />;
}
