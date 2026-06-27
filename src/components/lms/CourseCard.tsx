'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Clock, Layers } from 'lucide-react';
import Link from 'next/link';

import { useCourseBrowseBase } from '@/components/lms/CourseBrowseContext';
import { CourseTextThumbnail } from '@/components/lms/CourseTextThumbnail';
import { isOnboardingCourse, ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';
import { resolveDashboardCourseHref } from '@/lib/onboarding/navigation';

interface CourseCardProps {
  /** First visible cards: eager load + higher fetch priority (catalog / home grids). */
  priorityImage?: boolean;
  /** Visual treatment — featured uses slightly elevated homepage styling. */
  variant?: 'catalog' | 'featured';
  course: {
    id: string;
    slug: string;
    title: string;
    short_description?: string | null;
    price_aud: number | string;
    is_free?: boolean;
    level?: string | null;
    category?: string | null;
    discipline?: string | null;
    lesson_count?: number | null;
    module_count?: number | null;
    catalog_status?: string | null;
    thumbnail_url?: string | null;
    updated_at?: string | null;
    instructor?: { full_name: string } | null;
    cec_hours?: string | null;
    duration_hours?: string | null;
  };
}

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatLevel(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

const cardShellClass =
  'group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-[0_16px_48px_-24px_rgba(15,23,42,0.14)] dark:border-white/[0.08] dark:bg-[#0a0f18] dark:shadow-none dark:hover:border-white/[0.12] dark:hover:shadow-[0_20px_48px_-28px_rgba(0,0,0,0.55)]';

const featuredShellClass =
  'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_32px_-20px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-1 hover:border-[#2490ed]/25 hover:shadow-[0_24px_56px_-24px_rgba(36,144,237,0.2)] dark:border-white/10 dark:bg-[#0a0f18] dark:shadow-[0_16px_48px_-28px_rgba(0,0,0,0.45)] dark:hover:border-[#2490ed]/30 dark:hover:shadow-[0_28px_64px_-28px_rgba(36,144,237,0.18)]';

export function CourseCard({ course, priorityImage, variant = 'catalog' }: CourseCardProps) {
  const priceNum =
    typeof course.price_aud === 'string' ? parseFloat(course.price_aud) : course.price_aud;
  const isFree = course.is_free || priceNum === 0;
  const price = isFree ? 'Free' : `$${priceNum.toFixed(0)}`;

  const discipline =
    course.discipline ??
    (course.category?.match(/^(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT)/)
      ? course.category.split(' ')[0]
      : null);

  const { courseLinkBase } = useCourseBrowseBase();
  const thumbSrc = course.thumbnail_url ?? undefined;
  const isFeatured = variant === 'featured';
  const onboarding = isOnboardingCourse({ slug: course.slug, category: course.category });
  const href = resolveDashboardCourseHref({
    slug: course.slug,
    category: course.category,
    courseLinkBase,
  });
  const displayTitle = onboarding
    ? course.title.replace(`${ONBOARDING_BRAND} — `, '')
    : course.title;

  return (
    <motion.article
      className={isFeatured ? featuredShellClass : cardShellClass}
      whileHover={{ y: isFeatured ? -4 : -2 }}
      transition={{ duration: 0.22, ease: smoothEase }}
    >
      <Link href={href} className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden">
        <CourseTextThumbnail
          variant="card"
          title={course.title}
          category={onboarding ? 'Organisation onboarding' : course.category}
          discipline={discipline}
          priceLabel={price}
          isFree={isFree}
          level={course.level}
          cecHours={course.cec_hours}
          moduleCount={course.module_count}
          lessonCount={course.lesson_count}
          durationHours={course.duration_hours}
          shortDescription={course.short_description}
          draft={course.catalog_status === 'draft'}
          backdropImageSrc={thumbSrc}
          backdropImageLoading={priorityImage ? 'eager' : 'lazy'}
          backdropImageFetchPriority={priorityImage ? 'high' : 'auto'}
        />
      </Link>

      <div className={`flex flex-1 flex-col ${isFeatured ? 'gap-3 p-5' : 'gap-2.5 p-4'}`}>
        <h3
          className={`line-clamp-2 font-semibold leading-snug text-slate-950 dark:text-white ${
            isFeatured ? 'text-[1.05rem]' : 'text-[0.95rem]'
          }`}
        >
          <Link href={href} className="transition-colors hover:text-[#146fc2] dark:hover:text-[#8fd0ff]">
            {displayTitle}
          </Link>
        </h3>

        <div
          className={`mt-auto flex items-center justify-between gap-3 border-t pt-3 ${
            isFeatured
              ? 'border-slate-200/80 dark:border-white/10'
              : 'border-slate-200/70 dark:border-white/[0.08]'
          }`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-white/48">
            {course.module_count != null ? (
              <span className="inline-flex items-center gap-1" title="Modules">
                <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
                {course.module_count}
              </span>
            ) : null}
            {course.lesson_count != null ? (
              <span className="inline-flex items-center gap-1" title="Lessons">
                <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
                {course.lesson_count}
              </span>
            ) : null}
            {course.updated_at ? (
              <span className="inline-flex items-center gap-1" title="Last updated">
                <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" />
                {formatRelativeDate(course.updated_at)}
              </span>
            ) : null}
          </div>

          <Link
            href={href}
            aria-label={`View course: ${course.title}`}
            className={
              isFeatured
                ? 'inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#146fc2] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none'
                : 'inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#146fc2] transition hover:text-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none dark:text-[#8fd0ff] dark:hover:text-white'
            }
          >
            View
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}