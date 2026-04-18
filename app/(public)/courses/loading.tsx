import { CourseGridSkeleton } from '@/components/lms/CourseCardSkeleton';

/**
 * Next.js route-level loading UI for /courses.
 * Shown by Suspense while the async server component fetches course data.
 */
export default function CoursesLoading() {
  return (
    <main className="relative z-10 min-h-screen bg-[#050505]">
      <div className="relative z-10 mx-auto px-6 py-8 sm:py-10">
        {/* Hero header skeleton */}
        <header className="mb-6">
          <div className="mb-2 h-9 w-64 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-48 animate-pulse rounded bg-white/[0.04]" />
        </header>

        {/* Search bar skeleton */}
        <div className="relative mx-auto mb-8 max-w-2xl">
          <div className="h-11 w-full animate-pulse rounded-xl bg-white/[0.05]" />
        </div>

        {/* Course grid skeleton */}
        <section className="mb-10">
          <div
            className="rounded-sm p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Tab bar skeleton */}
            <div className="mb-5 flex gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="h-11 w-12 animate-pulse rounded bg-white/[0.05]" />
              ))}
            </div>
            <CourseGridSkeleton count={12} />
          </div>
        </section>
      </div>
    </main>
  );
}
