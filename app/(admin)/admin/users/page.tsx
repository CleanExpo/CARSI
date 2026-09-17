import { Suspense } from 'react';

import { AdminUsersClient } from '@/components/admin/AdminUsersClient';
import { getAdminDashboardData } from '@/lib/admin/admin-dashboard-data';

export default async function AdminUsersPage() {
  const data = await getAdminDashboardData();
  return (
    <Suspense>
      <AdminUsersClient users={data.users} />
    </Suspense>
  );
}
