export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-border bg-card">
      {/* Header shimmer */}
      <div className="relative h-32 w-full flex-shrink-0 animate-pulse bg-muted" />

      {/* Body */}
      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mb-1 h-3 w-full animate-pulse rounded bg-muted/50" />
        <div className="mb-2 h-3 w-2/3 animate-pulse rounded bg-muted/50" />

        <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 animate-pulse rounded bg-muted" />
            <div className="h-3 w-10 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
