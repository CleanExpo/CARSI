import { notFound } from 'next/navigation';

import { AdminUserDetailClient } from '@/components/admin/AdminUserDetailClient';
import { getAdminUserDetail } from '@/lib/admin/admin-user-progress';

type Props = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  const { userId } = await params;
  const detail = await getAdminUserDetail(userId);
  if (!detail) notFound();

  return (
    <AdminUserDetailClient
      user={detail.user}
      roleNames={detail.roleNames}
      catalogCourses={detail.catalogCourses}
    />
  );
}
