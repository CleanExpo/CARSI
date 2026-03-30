'use client';

import { CourseBrowseProvider } from '@/components/lms/CourseBrowseContext';

export default function DashboardCoursesLayout({ children }: { children: React.ReactNode }) {
  return <CourseBrowseProvider courseLinkBase="/dashboard/courses">{children}</CourseBrowseProvider>;
}
