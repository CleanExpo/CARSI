'use client';

import { AnimatedCard } from '@/components/landing/AnimatedHero';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { CourseBrowseProvider } from '@/components/lms/CourseBrowseContext';
import { CourseCard } from '@/components/lms/CourseCard';
import type { CourseListItem } from '@/lib/wordpress-export-courses';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface HomeFeaturedCoursesSectionProps {
  courses: CourseListItem[];
  courseCountLabel?: string;
}

function FeaturedCourseSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0f18]">
      <div className="aspect-video animate-pulse bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02]" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
      </div>
    </div>
  );
}

export function HomeFeaturedCoursesSection({
  courses,
  courseCountLabel,
}: HomeFeaturedCoursesSectionProps) {
  return (
    <section
      aria-labelledby="home-featured-courses-heading"
      className="relative border-t border-slate-200/80 bg-[#f6f8fb] py-14 md:py-20 dark:border-white/10 dark:bg-[#050505]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_85%_0%,rgba(36,144,237,0.08),transparent_55%)] dark:bg-[radial-gradient(ellipse_70%_45%_at_85%_0%,rgba(36,144,237,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#8fd0ff]">
              Featured courses
            </p>
            <h2
              id="home-featured-courses-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white"
            >
              Courses technicians open first
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/65">
              Self-paced IICRC CEC training you can start tonight — filter by discipline, level, or
              outcome{courseCountLabel ? ` across ${courseCountLabel} published courses` : ''}.
            </p>
          </div>

          <Link
            href="/courses"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#146fc2] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_32px_-14px_rgba(20,111,194,0.55)] transition hover:-translate-y-0.5 hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/50 focus-visible:outline-none"
          >
            View all courses
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <CourseBrowseProvider courseLinkBase="/courses">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.length > 0
              ? courses.map((course, i) => (
                  <AnimatedCard key={course.id} index={i}>
                    <CourseCard
                      course={course}
                      priorityImage={i < 6}
                      variant="featured"
                      showBrand={false}
                    />
                  </AnimatedCard>
                ))
              : [1, 2, 3].map((i) => (
                  <AnimatedCard key={i} index={i}>
                    <FeaturedCourseSkeleton />
                  </AnimatedCard>
                ))}
          </div>
        </CourseBrowseProvider>

        {courses.length > 0 ? (
          <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-slate-500 dark:text-white/45">
            <Sparkles className="h-3.5 w-3.5 text-[#ed9d24]" aria-hidden />
            Every course tracks progress and CEC hours in your learner dashboard.
          </p>
        ) : null}
      </div>
    </section>
  );
}
