import { getAdminDashboardData } from '@/lib/admin/admin-dashboard-data';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboardClient data={data} />;
}
