import { CourseGridSkeleton } from '@/components/lms/CourseCardSkeleton';

export default function CoursesLoading() {
  return (
    <main id="main-content" className="relative z-10 min-h-screen bg-[#050505]">
      <div className="relative z-10 mx-auto px-6 py-8 sm:py-10">
        {/* Hero header skeleton */}
        <header className="mb-6">
          <div className="mb-2 h-9 w-72 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-52 animate-pulse rounded bg-white/[0.04]" />
        </header>

        {/* Search bar skeleton */}
        <div className="relative mx-auto mb-8 max-w-2xl">
          <div className="h-12 w-full animate-pulse rounded-lg bg-white/[0.05]" />
        </div>

        {/* Course grid skeleton */}
        <section className="mb-10">
          <div
            className="rounded-sm p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Tab bar skeleton */}
            <div
              className="scrollbar-hide mb-5 flex gap-1 overflow-x-auto"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className="h-11 shrink-0 animate-pulse rounded-t bg-white/[0.04]"
                  style={{ width: i === 0 ? '3rem' : '3.5rem' }}
                />
              ))}
            </div>

            {/* Search + sort bar skeleton */}
            <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="h-9 w-52 animate-pulse rounded-lg bg-white/[0.05]" />
              <div className="h-9 w-36 animate-pulse rounded-lg bg-white/[0.05]" />
            </div>

            <CourseGridSkeleton count={12} />
          </div>
        </section>
      </div>
    </main>
  );
}
