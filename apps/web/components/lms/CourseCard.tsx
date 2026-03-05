'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clock } from 'lucide-react';

interface CourseCardProps {
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
    thumbnail_url?: string | null;
    updated_at?: string | null;
    instructor?: { full_name: string } | null;
  };
}

/**
 * Generates a fallback thumbnail path based on the course slug.
 * Attempts to find a matching local image in /images/courses/
 */
function getFallbackThumbnail(slug: string, title: string): string | null {
  // Common slug transformations
  const candidates = [
    slug,
    slug.replace(/-/g, '-'),
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  ];

  // Known course image mappings (subset - common patterns)
  const knownImages = new Set([
    'intro-water-damage-restoration',
    'intro-applied-structural-drying',
    'intro-applied-microbial-remediation',
    'mould-remediation-level-1',
    'carpet-cleaning-basics',
    'dehumidification',
    'flood-restoration',
    'fire-damage-assessment',
    'biohazard-remediation',
    'contents-restoration',
    'emergency-response',
    'insurance-documentation',
    'healthcare-cleaning',
    'commercial-kitchen-cleaning',
    'hard-floor-cleaning',
    'odour-control',
    'smoke-damage',
    'water-extraction',
    'structural-drying',
  ]);

  for (const candidate of candidates) {
    if (knownImages.has(candidate)) {
      return `/images/courses/${candidate}.webp`;
    }
  }

  return null;
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

export function CourseCard({ course }: CourseCardProps) {
  const [imageError, setImageError] = useState(false);
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

  // Determine thumbnail: API URL > local fallback > none (show gradient)
  const thumbnailUrl =
    !imageError && course.thumbnail_url
      ? course.thumbnail_url
      : getFallbackThumbnail(course.slug, course.title);

  return (
    <motion.div
      className="glass-card card-3d group flex flex-col overflow-hidden rounded-xl"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.25, ease: smoothEase }}
    >
      {/* Image / gradient header */}
      <div
        className={`relative h-32 w-full bg-gradient-to-br ${ds.grad} flex-shrink-0 overflow-hidden`}
      >
        {thumbnailUrl && (
          <Image
            src={thumbnailUrl}
            alt={course.title}
            fill
            className="object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {discipline && (
          <span
            className="absolute top-2 left-2 rounded-md px-2 py-0.5 font-mono text-xs font-bold"
            style={{
              color: ds.color,
              background: 'rgba(0,0,0,0.6)',
              border: `1px solid ${ds.color}40`,
              boxShadow: `0 0 8px ${ds.glow}`,
            }}
          >
            {discipline}
          </span>
        )}
        <span
          className="absolute top-2 right-2 rounded-md px-2 py-0.5 text-xs font-semibold"
          style={
            isFree
              ? {
                  color: '#27ae60',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(39,174,96,0.4)',
                }
              : {
                  color: '#ed9d24',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(237,157,36,0.4)',
                  boxShadow: '0 0 8px rgba(237,157,36,0.2)',
                }
          }
        >
          {price}
        </span>
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
            {course.lesson_count != null && (
              <span className="flex items-center gap-1">
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
            href={`/courses/${course.slug}`}
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
