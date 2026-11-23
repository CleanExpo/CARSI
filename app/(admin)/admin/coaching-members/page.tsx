import { AdminCoachingMemberWorkspaceClient } from '@/components/admin/AdminCoachingMemberWorkspaceClient';

export const metadata = {
  title: 'Coaching members | Admin',
  robots: { index: false, follow: false },
};

export default function AdminCoachingMembersPage() {
  return <AdminCoachingMemberWorkspaceClient />;
}