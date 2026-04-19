'use client';

import { motion } from 'framer-motion';
import { BookOpen, Clock, Layers } from 'lucide-react';
import Link from 'next/link';

import { useCourseBrowseBase } from '@/components/lms/CourseBrowseContext';
import { CourseTextThumbnail } from '@/components/lms/CourseTextThumbnail';

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

const disciplineColors: Record<string, { color: string; glow: string; grad: string }> = {
  WRT: { color: '#2490ed', glow: 'rgba(36,144,237,0.3)', grad: 'from-blue-700 to-blue-900' },
  CRT: { color: '#26c4a0', glow: 'rgba(38,196,160,0.3)', grad: 'from-teal-600 to-teal-900' },
  ASD: { color: '#6c63ff', glow: 'rgba(108,99,255,0.3)', grad: 'from-indigo-700 to-indigo-900' },
  OCT: { color: '#9b59b6', glow: 'rgba(155,89,182,0.3)', grad: 'from-purple-700 to-purple-900' },
  CCT: { color: '#17b8d4', glow: 'rgba(23,184,212,0.3)', grad: 'from-cyan-600 to-cyan-900' },
  FSRT: { color: '#f05a35', glow: 'rgba(240,90,53,0.3)', grad: 'from-orange-700 to-red-900' },
  AMRT: { color: '#27ae60', glow: 'rgba(39,174,96,0.3)', grad: 'from-green-700 to-green-900' },
};

const defaultStyle = {
  color: '#2490ed',
  glow: 'rgba(36,144,237,0.2)',
  grad: 'from-blue-800 to-slate-900',
};

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

  const ds = (discipline ? disciplineColors[discipline] : undefined) ?? defaultStyle;
  const disciplineSlug = discipline?.toLowerCase();
  const borderColor = disciplineSlug
    ? `hsl(var(--discipline-${disciplineSlug}))`
    : ds.color;
  const { courseLinkBase } = useCourseBrowseBase();

  const thumbSrc = course.thumbnail_url ?? undefined;

  return (
    <motion.div
      className="glass-card card-3d group flex flex-col overflow-hidden rounded-xl"
      style={{ borderColor, borderWidth: '2px' }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.25, ease: smoothEase }}
    >
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
            className="flex items-center gap-2 text-xs"
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
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeDate(course.updated_at)}
              </span>
            )}
          </div>
          <Link
            href={`${courseLinkBase}/${course.slug}`}
            className="-m-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm p-2 text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            style={{ color: ds.color }}
          >
            View →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
