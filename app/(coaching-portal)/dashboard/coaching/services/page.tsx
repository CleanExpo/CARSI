import { CoachingServicesPage } from '@/components/coaching-portal/CoachingModulePages';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const generateMetadata = () => coachingRouteMetadata('services');

export default function Page() {
  return <CoachingServicesPage />;
}
