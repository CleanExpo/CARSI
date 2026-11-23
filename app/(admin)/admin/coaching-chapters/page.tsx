import { AdminCoachingChaptersClient } from '@/components/admin/AdminCoachingChaptersClient';

export const metadata = {
  title: 'Coach chapters | Admin',
  robots: { index: false, follow: false },
};

export default function AdminCoachingChaptersPage() {
  return <AdminCoachingChaptersClient />;
}
