'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Clock, Layers } from 'lucide-react';
import Link from 'next/link';

import { useCourseBrowseBase } from '@/components/lms/CourseBrowseContext';
import { CourseTextThumbnail } from '@/components/lms/CourseTextThumbnail';
import { catalogueCourseCta } from '@/lib/learner-course-cta';
import { isOnboardingCourse, ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';
import { getOnboardingLearnPath, resolveDashboardCourseHref } from '@/lib/onboarding/navigation';

interface CourseCardProps {
  /** First visible cards: eager load + higher fetch priority (catalog / home grids). */
  priorityImage?: boolean;
  /** Visual treatment — featured is homepage; premium matches learner Home cards. */
  variant?: 'catalog' | 'featured' | 'premium';
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

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

const cardShellClass =
  'group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-[0_16px_48px_-24px_rgba(15,23,42,0.14)] dark:border-white/[0.08] dark:bg-[#0a0f18] dark:shadow-none dark:hover:border-white/[0.12] dark:hover:shadow-[0_20px_48px_-28px_rgba(0,0,0,0.55)]';

const featuredShellClass =
  'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_32px_-20px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-1 hover:border-[#2490ed]/25 hover:shadow-[0_24px_56px_-24px_rgba(36,144,237,0.2)] dark:border-white/10 dark:bg-[#0a0f18] dark:shadow-[0_16px_48px_-28px_rgba(0,0,0,0.45)] dark:hover:border-[#2490ed]/30 dark:hover:shadow-[0_28px_64px_-28px_rgba(36,144,237,0.18)]';

const premiumShellClass =
  'learner-home-surface learner-home-surface--flush learner-home-card group flex h-full flex-col overflow-hidden rounded-2xl';

export function CourseCard({ course, priorityImage, variant = 'catalog' }: CourseCardProps) {
  const priceNum =
    typeof course.price_aud === 'string' ? parseFloat(course.price_aud) : course.price_aud;
  const isFree = course.is_free || priceNum === 0;
  const price = isFree ? 'Free' : `$${priceNum.toFixed(0)}`;

  // GP-523: do NOT re-derive an IICRC discipline from the category string. That was a
  // fail-OPEN branding path — it re-attached a discipline acronym to a CARSI course even
  // after the stored `iicrcDiscipline` was nulled. Absent by default; only an explicitly
  // stored value is honoured, and it is rendered as a plain-English topic, never an acronym.
  const discipline = course.discipline ?? null;

  const { courseLinkBase, enrolledSlugs } = useCourseBrowseBase();
  const thumbSrc = course.thumbnail_url ?? undefined;
  const isFeatured = variant === 'featured';
  const isPremium = variant === 'premium';
  const onboarding = isOnboardingCourse({ slug: course.slug, category: course.category });
  const enrolled = enrolledSlugs.has(course.slug);
  const detailHref = resolveDashboardCourseHref({
    slug: course.slug,
    category: course.category,
    courseLinkBase,
  });
  const href = enrolled ? getOnboardingLearnPath(course.slug) : detailHref;
  const cta = catalogueCourseCta(enrolled);
  const displayTitle = onboarding
    ? course.title.replace(`${ONBOARDING_BRAND} — `, '')
    : course.title;

  return (
    <motion.article
      className={isPremium ? premiumShellClass : isFeatured ? featuredShellClass : cardShellClass}
      whileHover={{ y: isPremium || isFeatured ? -4 : -2 }}
      transition={{ duration: 0.22, ease: smoothEase }}
    >
      <Link
        href={href}
        className={`relative block w-full shrink-0 overflow-hidden ${
          isPremium ? 'aspect-[16/7]' : 'aspect-[16/10]'
        }`}
      >
        <CourseTextThumbnail
          variant="card"
          title={course.title}
          category={onboarding ? 'Organisation onboarding' : course.category}
          discipline={discipline}
          priceLabel={price}
          isFree={isFree}
          level={course.level}
          cecHoursLabel={isPremium ? null : course.cec_hours}
          moduleCount={isPremium ? null : course.module_count}
          lessonCount={isPremium ? null : course.lesson_count}
          durationHours={isPremium ? null : course.duration_hours}
          shortDescription={isPremium ? null : course.short_description}
          draft={course.catalog_status === 'draft'}
          backdropImageSrc={thumbSrc}
          backdropImageLoading={priorityImage ? 'eager' : 'lazy'}
          backdropImageFetchPriority={priorityImage ? 'high' : 'auto'}
        />
      </Link>

      <div
        className={`flex flex-1 flex-col ${
          isPremium ? 'gap-2 px-4 py-3.5' : isFeatured ? 'gap-3 p-5' : 'gap-2.5 p-4'
        }`}
      >
        {isPremium ? (
          <p className="text-[11px] font-semibold tracking-[0.18em] text-sky-300 uppercase">
            {course.cec_hours
              ? 'IICRC CEC Accredited'
              : onboarding
                ? 'Organisation program'
                : 'Professional learning'}
          </p>
        ) : null}
        <h3
          className={`line-clamp-2 leading-snug font-semibold ${
            isPremium ? 'text-white' : 'text-slate-950 dark:text-white'
          } ${isFeatured || isPremium ? 'text-[1.05rem]' : 'text-[0.95rem]'}`}
        >
          <Link
            href={href}
            className={
              isPremium
                ? 'transition-colors hover:text-sky-200'
                : 'transition-colors hover:text-[#146fc2] dark:hover:text-[#8fd0ff]'
            }
          >
            {displayTitle}
          </Link>
        </h3>
        <div
          className={`mt-auto flex items-center justify-between gap-3 border-t ${
            isPremium ? 'pt-2.5' : 'pt-3'
          } ${
            isPremium
              ? 'border-white/10'
              : isFeatured
                ? 'border-slate-200/80 dark:border-white/10'
                : 'border-slate-200/70 dark:border-white/[0.08]'
          }`}
        >
          <div
            className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs ${
              isPremium ? 'text-slate-200' : 'text-slate-700 dark:text-white/70'
            }`}
          >
            {course.module_count != null ? (
              <span className="inline-flex items-center gap-1" title="Modules">
                <Layers className="h-3.5 w-3.5 shrink-0" />
                {isPremium
                  ? `${course.module_count} module${course.module_count === 1 ? '' : 's'}`
                  : course.module_count}
              </span>
            ) : null}
            {course.lesson_count != null ? (
              <span className="inline-flex items-center gap-1" title="Lessons">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                {isPremium
                  ? `${course.lesson_count} lesson${course.lesson_count === 1 ? '' : 's'}`
                  : course.lesson_count}
              </span>
            ) : null}
            {isPremium && course.cec_hours ? (
              <span className="inline-flex items-center gap-1" title="Approved IICRC CEC hours">
                {course.cec_hours} IICRC CEC
              </span>
            ) : null}
            {course.updated_at ? (
              <span className="inline-flex items-center gap-1" title="Last updated">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {isPremium
                  ? `Updated ${formatRelativeDate(course.updated_at)}`
                  : formatRelativeDate(course.updated_at)}
              </span>
            ) : null}
          </div>

          <Link
            href={href}
            aria-label={`${cta}: ${course.title}`}
            className={
              isPremium
                ? 'inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-[0_8px_20px_-10px_rgba(56,189,248,0.7)] transition hover:bg-sky-50'
                : isFeatured
                  ? 'inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#146fc2] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none'
                  : 'inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#146fc2] transition hover:text-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none dark:text-[#8fd0ff] dark:hover:text-white'
            }
          >
            {isPremium
              ? enrolled
                ? 'Continue'
                : isFree
                  ? 'View free course'
                  : `View · ${price}`
              : cta}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
