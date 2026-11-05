import { CoachingPortalHome } from '@/components/coaching-portal/CoachingPortalHome';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const generateMetadata = () => coachingRouteMetadata('home');

export default function CoachingPortalHomePage() {
  return <CoachingPortalHome />;
}
