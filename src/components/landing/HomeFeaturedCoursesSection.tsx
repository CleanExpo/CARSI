'use client';

import { AnimatedCard } from '@/components/landing/AnimatedHero';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { CourseBrowseProvider } from '@/components/lms/CourseBrowseContext';
import { CourseCard } from '@/components/lms/CourseCard';
import type { CourseListItem } from '@/lib/course-list-item';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface HomeFeaturedCoursesSectionProps {
  courses: CourseListItem[];
  courseCountLabel?: string;
}

function FeaturedCourseSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="aspect-[16/10] animate-pulse bg-gradient-to-br from-slate-100 to-slate-50" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

/**
 * Light institutional shell around the product-critical course cards, the one place
 * on the homepage where cards are appropriate (interactive catalogue product).
 */
export function HomeFeaturedCoursesSection({
  courses,
  courseCountLabel,
}: HomeFeaturedCoursesSectionProps) {
  return (
    <section
      aria-labelledby="home-featured-courses-heading"
      className="relative border-t border-slate-200/70 bg-white py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className={LANDING_EYEBROW_CLASS}>Featured courses</p>
            <h2 id="home-featured-courses-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              The courses working crews start with
            </h2>
            <p className={`mt-4 max-w-xl text-pretty ${LANDING_LEAD_CLASS}`}>
              Self-paced training you can begin tonight and finish around the roster. Filter by
              discipline, level, or outcome
              {courseCountLabel ? ` across ${courseCountLabel} published courses` : ''}.
            </p>
          </div>

          <Link
            href="/courses"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-6 text-sm font-semibold text-white shadow-[0_14px_40px_-16px_rgba(20,111,194,0.55)] transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
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
                    <CourseCard course={course} priorityImage={i < 6} variant="featured" />
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
          <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-[#a85500]" aria-hidden />
            Every course tracks progress and CEC hours in your learner dashboard.
          </p>
        ) : null}
      </div>
    </section>
  );
}
