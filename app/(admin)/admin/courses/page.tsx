import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

import { AdminCoursesList } from '@/components/admin/courses/AdminCoursesList';

export default function AdminCoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-white/50">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading courses…
        </div>
      }
    >
      <AdminCoursesList />
    </Suspense>
  );
}
