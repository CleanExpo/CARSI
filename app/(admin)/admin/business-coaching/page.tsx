import { AdminBusinessCoachingClient } from '@/components/admin/AdminBusinessCoachingClient';
import { AdminCoachingChaptersPanel } from '@/components/admin/AdminCoachingChaptersPanel';

export const dynamic = 'force-dynamic';

export default function AdminBusinessCoachingPage() {
  return (
    <>
      <AdminBusinessCoachingClient />
      <AdminCoachingChaptersPanel />
    </>
  );
}
