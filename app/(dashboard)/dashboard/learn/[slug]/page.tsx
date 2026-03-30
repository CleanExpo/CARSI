import { Suspense } from 'react';

import { LearnCourseShell } from '@/components/lms/LearnCourseShell';

export default async function LearnCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="w-full min-w-0">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-white/55">
            Loading…
          </div>
        }
      >
        <LearnCourseShell slug={slug} />
      </Suspense>
    </div>
  );
}
