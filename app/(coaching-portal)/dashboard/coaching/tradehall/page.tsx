import { CoachingTradeHallPage } from '@/components/coaching-portal/CoachingModulePages';
import { coachingRouteMetadata } from '@/lib/coaching-portal/coaching-route-metadata';

export const metadata = coachingRouteMetadata('tradehall');

export default function TradeHallPage() {
  return <CoachingTradeHallPage />;
}