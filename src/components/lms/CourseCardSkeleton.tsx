export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#0a0f18]">
      <div className="aspect-[16/10] w-full shrink-0 animate-pulse bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02]" />

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex gap-2">
          <div className="h-5 w-14 animate-pulse rounded-md bg-slate-100 dark:bg-white/[0.06]" />
          <div className="h-5 w-16 animate-pulse rounded-md bg-slate-100 dark:bg-white/[0.06]" />
        </div>
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-slate-100 dark:bg-white/[0.05]" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-white/[0.04]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-white/[0.04]" />

        <div className="mt-auto flex items-center justify-between border-t border-slate-200/70 pt-3 dark:border-white/[0.08]">
          <div className="flex gap-3">
            <div className="h-3 w-8 animate-pulse rounded bg-slate-100 dark:bg-white/[0.05]" />
            <div className="h-3 w-10 animate-pulse rounded bg-slate-100 dark:bg-white/[0.05]" />
          </div>
          <div className="h-8 w-14 animate-pulse rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
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
