'use client';

import Image from 'next/image';
import { useState } from 'react';

import { MARGOT_ACCENT, MARGOT_AVATAR_PATH, MARGOT_DISPLAY_NAME } from '@/lib/margot-surface';

type Variant = 'default' | 'launcher' | 'inline';

type Props = {
  size?: number;
  showStatus?: boolean;
  variant?: Variant;
  className?: string;
};

/** Face focal point for the waist-up portrait asset — keeps eyes centred in the circle. */
const FACE_ORIGIN = '50% 14%';

const ZOOM: Record<Variant, number> = {
  default: 1.18,
  launcher: 1.22,
  inline: 1.18,
};

export function MargotAvatar({
  size = 40,
  showStatus = false,
  variant = 'default',
  className = '',
}: Props) {
  const [failed, setFailed] = useState(false);
  const zoom = ZOOM[variant];
  const ringWidth =
    variant === 'launcher' ? Math.max(2, Math.round(size * 0.035)) : Math.max(2, Math.round(size * 0.04));

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-[#146fc2] to-[#0f5fa8] font-semibold text-white ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(12, size * 0.38) }}
        aria-hidden
      >
        M
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            variant === 'launcher'
              ? `linear-gradient(145deg, ${MARGOT_ACCENT}, #0a4d8c)`
              : `linear-gradient(135deg, ${MARGOT_ACCENT}88, #0f5fa8aa)`,
          padding: ringWidth,
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full bg-[#dce3ea]">
          <Image
            src={MARGOT_AVATAR_PATH}
            alt={`${MARGOT_DISPLAY_NAME} avatar`}
            width={size}
            height={size}
            className="h-full w-full object-cover"
            style={{
              objectPosition: FACE_ORIGIN,
              transform: `scale(${zoom})`,
              transformOrigin: FACE_ORIGIN,
            }}
            onError={() => setFailed(true)}
            priority={size >= 40}
          />
        </div>
      </div>
      {showStatus ? (
        <span
          className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-[#060a14] bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.65)]"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
