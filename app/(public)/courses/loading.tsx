import { CourseGridSkeleton } from '@/components/lms/CourseCardSkeleton';

// GP-364 PR 4/4 — suspense fallback for /courses while the catalogue loads.
export default function CoursesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-white/[0.06]" />
      <div className="mb-8 h-4 w-96 animate-pulse rounded bg-white/[0.04]" />
      <CourseGridSkeleton count={12} />
    </div>
  );
}
