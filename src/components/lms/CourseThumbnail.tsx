'use client';

import { useMemo, useState } from 'react';

interface CourseThumbnailProps {
  src?: string | null;
  title: string;
}

function fallbackSrc() {
  return '/logo/logo1.png';
}

export function CourseThumbnail({ src, title }: CourseThumbnailProps) {
  const [failed, setFailed] = useState(false);

  const resolvedSrc = useMemo(() => {
    if (!src) return fallbackSrc();
    const trimmed = src.trim();
    if (!trimmed) return fallbackSrc();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
    }
    return trimmed;
  }, [src]);

  if (failed) {
    return (
      <div
        className="mb-4 aspect-video overflow-hidden rounded-sm p-5"
        style={{
          border: '1px solid rgba(255,255,255,0.07)',
          background:
            'linear-gradient(135deg, rgba(237,157,36,0.12) 0%, rgba(36,144,237,0.08) 100%)',
        }}
      >
        <p className="text-xs font-semibold tracking-wide uppercase text-white/60">Course Preview</p>
        <p className="mt-2 line-clamp-2 text-sm font-medium text-white/85">{title}</p>
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-hidden rounded-sm" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={title}
        className="aspect-video w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

