import { CoachingResourcesPage } from '@/components/coaching-portal/CoachingModulePages';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const generateMetadata = () => coachingRouteMetadata('resources');

export default function Page() {
  return <CoachingResourcesPage />;
}
