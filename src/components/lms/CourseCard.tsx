'use client';

import { motion } from 'framer-motion';
import { Award, BookOpen, Clock, Layers } from 'lucide-react';
import Link from 'next/link';

import { useCourseBrowseBase } from '@/components/lms/CourseBrowseContext';
import { CourseTextThumbnail } from '@/components/lms/CourseTextThumbnail';

interface CourseCardProps {
  /** First visible cards: eager load + higher fetch priority (catalog / home grids). */
  priorityImage?: boolean;
  /** Homepage featured grid: cleaner thumbnails without CARSI logo. */
  showBrand?: boolean;
  /** Visual treatment — featured uses premium homepage styling. */
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

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function CourseCard({
  course,
  priorityImage,
  showBrand = true,
  variant = 'catalog',
}: CourseCardProps) {
  const priceNum =
    typeof course.price_aud === 'string' ? parseFloat(course.price_aud) : course.price_aud;
  const isFree = course.is_free || priceNum === 0;
  const price = isFree ? 'Free' : `$${priceNum.toFixed(0)} AUD`;

  const discipline =
    course.discipline ??
    (course.category?.match(/^(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT)/)
      ? course.category.split(' ')[0]
      : null);

  const { courseLinkBase } = useCourseBrowseBase();

  const thumbSrc = course.thumbnail_url ?? undefined;
  const isFeatured = variant === 'featured';

  return (
    <motion.div
      className={
        isFeatured
          ? 'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-32px_rgba(15,23,42,0.18)] transition-shadow hover:shadow-[0_28px_60px_-28px_rgba(36,144,237,0.22)] dark:border-white/10 dark:bg-[#0a0f18] dark:shadow-[0_24px_56px_-32px_rgba(0,0,0,0.55)] dark:hover:shadow-[0_28px_64px_-28px_rgba(36,144,237,0.18)]'
          : 'group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg hover:shadow-slate-200/80'
      }
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: smoothEase }}
    >
      {/* Textual thumbnail always; optional photo behind */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden">
        <CourseTextThumbnail
          variant="card"
          showBrand={showBrand}
          title={course.title}
          category={course.category}
          discipline={discipline}
          priceLabel={price}
          isFree={isFree}
          moduleCount={course.module_count}
          lessonCount={course.lesson_count}
          level={course.level}
          cecHours={course.cec_hours}
          durationHours={course.duration_hours}
          shortDescription={course.short_description}
          instructorName={course.instructor?.full_name ?? null}
          draft={course.catalog_status === 'draft'}
          backdropImageSrc={thumbSrc}
          backdropImageLoading={priorityImage ? 'eager' : 'lazy'}
          backdropImageFetchPriority={priorityImage ? 'high' : 'auto'}
        />
      </div>

      {/* Card body */}
      <div className={`flex flex-1 flex-col ${isFeatured ? 'p-5' : 'p-4'}`}>
        <h3
          className={`mb-2 line-clamp-2 font-semibold leading-snug text-slate-950 dark:text-white ${
            isFeatured ? 'text-[1.05rem]' : 'text-base'
          }`}
        >
          {course.title}
        </h3>

        {course.cec_hours ? (
          <p className="mb-2 inline-flex items-center gap-1 rounded-md border border-[#b8dbfb] bg-[#eef7ff] px-2 py-0.5 text-[11px] font-semibold text-[#0f5fa8] dark:border-[#2490ed]/30 dark:bg-[#2490ed]/10 dark:text-[#8fd0ff]">
            <Award className="h-3 w-3 shrink-0" aria-hidden />
            {course.cec_hours} IICRC CEC{course.cec_hours === '1' ? '' : 's'}
          </p>
        ) : null}

        {course.short_description && (
          <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-white/60">
            {course.short_description}
          </p>
        )}

        <div
          className={`mt-auto flex items-center justify-between pt-3 ${
            isFeatured ? 'border-t border-slate-200/80 dark:border-white/10' : ''
          }`}
          style={isFeatured ? undefined : { borderTop: '1px solid rgba(15,23,42,0.08)' }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-white/50">
            {course.module_count != null && (
              <span className="flex items-center gap-1" title="Modules">
                <Layers className="h-3 w-3" />
                {course.module_count}
              </span>
            )}
            {course.lesson_count != null && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {course.lesson_count}
              </span>
            )}
            {course.cec_hours ? (
              <span className="flex items-center gap-1" title="IICRC continuing education credits">
                <Award className="h-3 w-3" style={{ color: '#146fc2' }} />
                {course.cec_hours}
              </span>
            ) : null}
            {course.updated_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeDate(course.updated_at)}
              </span>
            )}
          </div>
          <Link
            href={`${courseLinkBase}/${course.slug}`}
            aria-label={`View course: ${course.title}`}
            className={
              isFeatured
                ? '-m-2 flex min-h-[44px] min-w-[96px] items-center justify-center rounded-lg bg-[#146fc2] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0f5fa8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]/40'
                : '-m-2 flex min-h-[44px] min-w-[86px] items-center justify-center rounded-md p-2 text-xs font-semibold text-[#146fc2] transition-all duration-150 hover:bg-[#eef7ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]/40'
            }
          >
            View course
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
