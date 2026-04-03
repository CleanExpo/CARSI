'use client';

import { useMemo, useState } from 'react';

import { bypassNextImageOptimizer, normalizePublicAssetUrl } from '@/lib/remote-image';

interface CourseThumbnailProps {
  src?: string | null;
  title: string;
  /** Omit bottom margin when nested in dense layouts (e.g. enrolment cards). */
  compact?: boolean;
}

function ThumbnailPlaceholder({ title, compact }: { title: string; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'aspect-video overflow-hidden rounded-sm p-5'
          : 'mb-4 aspect-video overflow-hidden rounded-sm p-5'
      }
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        background:
          'linear-gradient(135deg, rgba(237,157,36,0.12) 0%, rgba(36,144,237,0.08) 100%)',
      }}
    >
      <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">Course preview</p>
      <p className="mt-2 line-clamp-3 text-sm font-medium text-white/85">{title}</p>
    </div>
  );
}

export function CourseThumbnail({ src, title, compact }: CourseThumbnailProps) {
  const [failed, setFailed] = useState(false);

  const resolvedSrc = useMemo(() => {
    const normalized = normalizePublicAssetUrl(src);
    if (!normalized) return null;
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      if (bypassNextImageOptimizer(normalized)) return normalized;
      return `/api/image-proxy?url=${encodeURIComponent(normalized)}`;
    }
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }, [src]);

  if (failed || !resolvedSrc) {
    return <ThumbnailPlaceholder title={title} compact={compact} />;
  }

  return (
    <div
      className={compact ? 'overflow-hidden rounded-sm' : 'mb-4 overflow-hidden rounded-sm'}
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={title}
        className="aspect-video w-full object-contain object-center bg-black/30"
        loading="eager"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
