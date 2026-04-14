'use client';

import { useEffect, useMemo, useState } from 'react';

import { bypassNextImageOptimizer, normalizePublicAssetUrl } from '@/lib/remote-image';

import { CourseTextThumbnail } from '@/components/lms/CourseTextThumbnail';

interface CourseThumbnailProps {
  src?: string | null;
  title: string;
  /** Omit bottom margin when nested in dense layouts (e.g. enrolment cards). */
  compact?: boolean;
  category?: string | null;
  discipline?: string | null;
  priceLabel?: string | null;
  isFree?: boolean;
  moduleCount?: number | null;
  lessonCount?: number | null;
  level?: string | null;
  cecHours?: string | null;
  durationHours?: string | null;
  shortDescription?: string | null;
  instructorName?: string | null;
  draft?: boolean;
}

export function CourseThumbnail({
  src,
  title,
  compact,
  category,
  discipline,
  priceLabel,
  isFree,
  moduleCount,
  lessonCount,
  level,
  cecHours,
  durationHours,
  shortDescription,
  instructorName,
  draft,
}: CourseThumbnailProps) {
  const [backdropFailed, setBackdropFailed] = useState(false);

  useEffect(() => {
    setBackdropFailed(false);
  }, [src]);

  const resolvedSrc = useMemo(() => {
    const normalized = normalizePublicAssetUrl(src);
    if (!normalized) return null;
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      if (bypassNextImageOptimizer(normalized)) return normalized;
      return `/api/image-proxy?url=${encodeURIComponent(normalized)}`;
    }
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }, [src]);

  const variant = compact ? 'card' : 'hero';
  const wrapClass = compact ? 'overflow-hidden rounded-sm' : 'mb-4 overflow-hidden rounded-sm';

  const backdrop =
    resolvedSrc && !backdropFailed ? resolvedSrc : undefined;

  return (
    <div className={wrapClass} style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="aspect-video">
        <CourseTextThumbnail
          variant={variant}
          title={title}
          category={category}
          discipline={discipline}
          priceLabel={priceLabel}
          isFree={isFree}
          moduleCount={moduleCount}
          lessonCount={lessonCount}
          level={level}
          cecHours={cecHours}
          durationHours={durationHours}
          shortDescription={shortDescription}
          instructorName={instructorName}
          draft={draft}
          backdropImageSrc={backdrop}
          backdropImageLoading="eager"
          backdropImageFetchPriority={compact ? 'auto' : 'high'}
          onBackdropImageError={() => setBackdropFailed(true)}
        />
      </div>
    </div>
  );
}
