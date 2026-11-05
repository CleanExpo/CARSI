import { CoachingProgressPage } from '@/components/coaching-portal/CoachingAccountability';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const generateMetadata = () => coachingRouteMetadata('progress');

export default function Page() {
  return <CoachingProgressPage />;
}
