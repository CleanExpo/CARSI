import { AdminCoachingGapMapClient } from '@/components/admin/AdminCoachingGapMapClient';
import { AdminCoachingLearningPathsClient } from '@/components/admin/AdminCoachingLearningPathsClient';

export const dynamic = 'force-dynamic';

export default function AdminCoachingLearningPathsPage() {
  return (
    <>
      <AdminCoachingLearningPathsClient />
      <AdminCoachingGapMapClient />
    </>
  );
}
