import { redirect } from 'next/navigation';

/** Learner-dashboard alias — course admin lives under /admin/courses. */
export default function DashboardAdminCoursesAliasPage() {
  redirect('/admin/courses');
}
