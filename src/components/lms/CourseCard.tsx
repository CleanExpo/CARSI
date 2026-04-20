'use client';

import { motion } from 'framer-motion';
import { BookOpen, Clock, Layers } from 'lucide-react';
import Link from 'next/link';

import { useCourseBrowseBase } from '@/components/lms/CourseBrowseContext';
import { CourseTextThumbnail } from '@/components/lms/CourseTextThumbnail';
import { disciplineToken } from '@/lib/discipline-tokens';

interface CourseCardProps {
  /** First visible cards: eager load + higher fetch priority (catalog / home grids). */
  priorityImage?: boolean;
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

// GP-335 PR 1/4: accent now resolved via --discipline-* tokens.
// The legacy glow/grad values (never currently rendered) are removed in this
// migration; they'll come back as first-class tokens in PR 4/4 (border + glow).
const DEFAULT_ACCENT_TOKEN = 'hsl(var(--discipline-water-500))'; // pragma: allowlist secret

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function CourseCard({ course, priorityImage }: CourseCardProps) {
  const priceNum =
    typeof course.price_aud === 'string' ? parseFloat(course.price_aud) : course.price_aud;
  const isFree = course.is_free || priceNum === 0;
  const price = isFree ? 'Free' : `$${priceNum.toFixed(0)} AUD`;

  const discipline =
    course.discipline ??
    (course.category?.match(/^(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT)/)
      ? course.category.split(' ')[0]
      : null);

  const accentColor = disciplineToken(discipline) ?? DEFAULT_ACCENT_TOKEN;
  const { courseLinkBase } = useCourseBrowseBase();

  const thumbSrc = course.thumbnail_url ?? undefined;

  return (
    <motion.div
      className="glass-card card-3d group relative flex flex-col overflow-hidden rounded-xl"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.25, ease: smoothEase }}
    >
      {/* GP-364: discipline accent stripe on card top (2px, no layout shift) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px]"
        style={{ background: accentColor }}
      />
      {/* Textual thumbnail always; optional photo behind */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden">
        <CourseTextThumbnail
          variant="card"
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
      <div className="flex flex-1 flex-col p-3">
        <h3
          className="mb-2 line-clamp-2 text-sm leading-snug font-semibold"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          {course.title}
        </h3>

        {course.short_description && (
          <p
            className="mb-2 line-clamp-2 text-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            {course.short_description}
          </p>
        )}

        <div
          className="mt-auto flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="flex items-center gap-2 text-xs tabular-nums"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {course.module_count != null && (
              <span className="flex items-center gap-1 tabular-nums" title="Modules">
                <Layers className="h-3 w-3" />
                {course.module_count}
              </span>
            )}
            {course.lesson_count != null && (
              <span className="flex items-center gap-1 tabular-nums">
                <BookOpen className="h-3 w-3" />
                {course.lesson_count}
              </span>
            )}
            {course.updated_at && (
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" />
                {formatRelativeDate(course.updated_at)}
              </span>
            )}
          </div>
          <Link
            href={`${courseLinkBase}/${course.slug}`}
            className="-m-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm p-2 text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            style={{ color: accentColor }}
          >
            View →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
