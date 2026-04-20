export function CourseCardSkeleton() {
  return (
    <div className="glass-card relative flex flex-col overflow-hidden rounded-xl">
      {/* GP-364: neutral accent stripe placeholder to mirror real card height */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] bg-white/[0.08]"
      />
      {/* Header shimmer */}
      <div className="relative aspect-video w-full shrink-0 animate-pulse bg-white/[0.04]" />

      {/* Body */}
      <div className="flex flex-1 flex-col p-3">
        {/* Title lines */}
        <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
        <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-white/[0.04]" />

        {/* Description lines */}
        <div className="mb-1 h-3 w-full animate-pulse rounded bg-white/[0.03]" />
        <div className="mb-2 h-3 w-2/3 animate-pulse rounded bg-white/[0.03]" />

        {/* Footer */}
        <div
          className="mt-auto flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-3 w-10 animate-pulse rounded bg-white/[0.05]" />
          </div>
          <div className="h-3 w-12 animate-pulse rounded bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

interface CourseGridSkeletonProps {
  count?: number;
}

export function CourseGridSkeleton({ count = 8 }: CourseGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
