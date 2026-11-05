import { CoachingSessionsPage } from '@/components/coaching-portal/CoachingModulePages';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const generateMetadata = () => coachingRouteMetadata('sessions');

export default function Page() {
  return <CoachingSessionsPage />;
}
