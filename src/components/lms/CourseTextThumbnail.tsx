'use client';

import { BookOpen, Clock, GraduationCap, Layers, User } from 'lucide-react';
import Image from 'next/image';
import type { ImgHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Primary CARSI mark for textual course art (public/). */
export const CARSI_COURSE_LOGO_SRC = '/logo/logo1.png';

const DISCIPLINE_ACCENTS: Record<
  string,
  { fg: string; glow: string; from: string; via: string; to: string }
> = {
  WRT: {
    fg: '#5cb3f5',
    glow: 'rgba(36,144,237,0.45)',
    from: '#0f2744',
    via: '#132a4a',
    to: '#060d18',
  },
  CRT: {
    fg: '#4ee0c3',
    glow: 'rgba(38,196,160,0.4)',
    from: '#0f2e28',
    via: '#123d34',
    to: '#060f0d',
  },
  ASD: {
    fg: '#a29bfa',
    glow: 'rgba(108,99,255,0.4)',
    from: '#1a1740',
    via: '#221e4a',
    to: '#0a0818',
  },
  OCT: {
    fg: '#c792ea',
    glow: 'rgba(155,89,182,0.35)',
    from: '#2a1535',
    via: '#321a40',
    to: '#0f0814',
  },
  CCT: {
    fg: '#5ee7f9',
    glow: 'rgba(23,184,212,0.35)',
    from: '#0a2a32',
    via: '#0d3540',
    to: '#050e12',
  },
  FSRT: {
    fg: '#ff8f73',
    glow: 'rgba(240,90,53,0.35)',
    from: '#351a12',
    via: '#402018',
    to: '#120a08',
  },
  AMRT: {
    fg: '#5ee9a0',
    glow: 'rgba(39,174,96,0.35)',
    from: '#0f2a1c',
    via: '#123824',
    to: '#060d09',
  },
};

const CATEGORY_ACCENTS: { test: (c: string) => boolean; key: string }[] = [
  { test: (c) => /safety|ppe/i.test(c), key: 'safety' },
  { test: (c) => /whs|compliance/i.test(c), key: 'whs' },
  { test: (c) => /marketing|business/i.test(c), key: 'mkt' },
];

const EXTRA_ACCENTS: Record<string, (typeof DISCIPLINE_ACCENTS)['WRT']> = {
  safety: {
    fg: '#f0b429',
    glow: 'rgba(240,180,41,0.35)',
    from: '#2a2210',
    via: '#352a12',
    to: '#0f0c06',
  },
  whs: {
    fg: '#7dd3fc',
    glow: 'rgba(125,211,252,0.3)',
    from: '#0f2433',
    via: '#122d42',
    to: '#060c12',
  },
  mkt: {
    fg: '#f472b6',
    glow: 'rgba(244,114,182,0.3)',
    from: '#2a1528',
    via: '#381830',
    to: '#100810',
  },
};

function hashHue(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i += 1) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return h % 360;
}

function inferDisciplineCode(category: string | null | undefined, discipline: string | null | undefined) {
  const d = discipline?.trim().toUpperCase();
  if (d && DISCIPLINE_ACCENTS[d]) return d;
  const cat = category?.trim() ?? '';
  const m = cat.match(/^(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT)\b/i);
  if (m) return m[1]!.toUpperCase();
  return null;
}

function shouldShowCategoryLabel(category: string | null | undefined, code: string | null) {
  const c = category?.trim();
  if (!c) return false;
  if (!code) return true;
  return c.toUpperCase() !== code;
}

export function getCourseTextAccent(
  title: string,
  category?: string | null,
  discipline?: string | null
): (typeof DISCIPLINE_ACCENTS)['WRT'] {
  const code = inferDisciplineCode(category, discipline);
  if (code && DISCIPLINE_ACCENTS[code]) return DISCIPLINE_ACCENTS[code]!;

  const catLower = category?.toLowerCase() ?? '';
  for (const { test, key } of CATEGORY_ACCENTS) {
    if (test(catLower) && EXTRA_ACCENTS[key]) return EXTRA_ACCENTS[key]!;
  }

  const hue = hashHue(title);
  return {
    fg: `hsl(${hue} 72% 68%)`,
    glow: `hsla(${hue}, 70%, 50%, 0.28)`,
    from: `hsl(${hue} 35% 14%)`,
    via: `hsl(${(hue + 12) % 360} 32% 11%)`,
    to: '#06080f',
  };
}

export type CourseTextThumbnailProps = {
  title: string;
  category?: string | null;
  discipline?: string | null;
  /** e.g. "Free" or "$99 AUD" */
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
  /** Card grid, course hero sidebar, or admin list */
  variant?: 'card' | 'hero' | 'admin';
  className?: string;
  /**
   * Optional catalogue photo behind the text (gradient scrim keeps copy readable).
   * When set, the textual layout is always shown on top.
   */
  backdropImageSrc?: string | null;
  backdropImageLoading?: ImgHTMLAttributes<HTMLImageElement>['loading'];
  backdropImageFetchPriority?: ImgHTMLAttributes<HTMLImageElement>['fetchPriority'];
  backdropImageReferrerPolicy?: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  onBackdropImageError?: () => void;
};

export function CourseTextThumbnail({
  title,
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
  variant = 'card',
  className,
  backdropImageSrc,
  backdropImageLoading = 'lazy',
  backdropImageFetchPriority,
  backdropImageReferrerPolicy,
  onBackdropImageError,
}: CourseTextThumbnailProps) {
  const accent = getCourseTextAccent(title, category, discipline);
  const code = inferDisciplineCode(category, discipline);
  const showCategory = shouldShowCategoryLabel(category, code);
  const hasBackdrop = Boolean(backdropImageSrc?.trim());

  const titleClass =
    variant === 'hero'
      ? 'font-display text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl'
      : variant === 'admin'
        ? 'text-sm font-semibold leading-snug text-white'
        : 'text-sm font-bold leading-snug text-white';

  const descLines = variant === 'hero' ? 3 : variant === 'admin' ? 2 : 2;
  const showDesc = Boolean(shortDescription?.trim());

  const logoH = variant === 'hero' ? 32 : variant === 'admin' ? 28 : 26;
  const showModuleCallout =
    moduleCount != null && (moduleCount > 0 || variant === 'admin');

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 w-full flex-col overflow-hidden',
        variant === 'hero' ? 'p-4 sm:p-5' : variant === 'admin' ? 'p-3.5' : 'p-3',
        hasBackdrop && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]',
        className
      )}
      style={
        hasBackdrop
          ? { background: '#0a0c10' }
          : {
              background: `linear-gradient(145deg, ${accent.from} 0%, ${accent.via} 48%, ${accent.to} 100%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px -12px ${accent.glow}`,
            }
      }
    >
      {hasBackdrop ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- external / CDN URLs */}
          <img
            src={backdropImageSrc!.trim()}
            alt=""
            loading={backdropImageLoading}
            decoding="async"
            fetchPriority={backdropImageFetchPriority}
            referrerPolicy={backdropImageReferrerPolicy}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
            onError={onBackdropImageError}
          />
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-black/72 via-black/48 to-black/78"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-55"
            style={{
              background: `linear-gradient(145deg, ${accent.from} 0%, transparent 52%, ${accent.to} 100%)`,
            }}
            aria-hidden
          />
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full blur-3xl"
            style={{ background: accent.glow }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.35) 45%, transparent 90%)`,
              backgroundSize: '18px 100%',
            }}
            aria-hidden
          />
        </>
      )}

      <div
        className={cn(
          'relative z-1 flex flex-1 flex-col',
          hasBackdrop && '[text-shadow:0_1px_2px_rgba(0,0,0,0.85)]'
        )}
      >
        {/* Brand + price */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="relative min-w-0 shrink pt-0.5" style={{ height: logoH }}>
            <Image
              src={CARSI_COURSE_LOGO_SRC}
              alt="CARSI"
              width={140}
              height={48}
              className="h-full w-auto max-w-[min(100%,9.5rem)] object-contain object-left drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
            />
          </div>
          {priceLabel ? (
            <span
              className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums"
              style={
                isFree
                  ? {
                      color: '#5ee9a0',
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(94,233,160,0.35)',
                    }
                  : {
                      color: '#f5c15c',
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(245,193,92,0.35)',
                      boxShadow: '0 0 14px rgba(237,157,36,0.15)',
                    }
              }
            >
              {priceLabel}
            </span>
          ) : null}
        </div>

        {/* Discipline / category / draft */}
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          {code && (
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide"
              style={{
                color: accent.fg,
                background: 'rgba(0,0,0,0.45)',
                border: `1px solid ${accent.fg}55`,
                boxShadow: `0 0 12px ${accent.glow}`,
              }}
            >
              IICRC {code}
            </span>
          )}
          {showCategory && (
            <span
              className="line-clamp-1 max-w-full rounded px-1.5 py-0.5 text-[9px] font-medium text-white/80"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {category}
            </span>
          )}
          {draft && (
            <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-black uppercase">
              Draft
            </span>
          )}
        </div>

        <h3 className={cn(titleClass, variant === 'card' ? 'line-clamp-2' : 'line-clamp-3')}>{title}</h3>

        {showModuleCallout ? (
          <div
            className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-white/10 px-2 py-1.5"
            style={{ background: 'rgba(0,0,0,0.28)' }}
          >
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white tabular-nums">
              <Layers className="h-3.5 w-3.5" style={{ color: accent.fg }} />
              {moduleCount} module{moduleCount === 1 ? '' : 's'}
            </span>
            {lessonCount != null && lessonCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/65">
                <BookOpen className="h-3 w-3 opacity-70" />
                {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        ) : null}

        {showDesc ? (
          <p
            className="mt-2 text-[11px] leading-relaxed text-white/55"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: descLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {shortDescription}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-x-2.5 gap-y-1 border-t border-white/10 pt-2 text-[9px] text-white/50">
          {level ? (
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-3 w-3 shrink-0 text-white/35" />
              {level}
            </span>
          ) : null}
          {cecHours ? (
            <span className="text-cyan-300/85">
              {cecHours} IICRC CEC{cecHours === '1' ? '' : 's'}
            </span>
          ) : null}
          {durationHours ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0 text-white/35" />
              {durationHours}h
            </span>
          ) : null}
          {instructorName ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <User className="h-3 w-3 shrink-0 text-white/35" />
              <span className="truncate">{instructorName}</span>
            </span>
          ) : null}
        </div>

        {variant === 'card' ? (
          <p className="mt-1.5 truncate text-[7px] tracking-wide text-white/30 uppercase">
            CARSI · Restoration training · Australia
          </p>
        ) : (
          <div className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2">
            <div className="relative h-5 w-14 shrink-0 opacity-80">
              <Image
                src={CARSI_COURSE_LOGO_SRC}
                alt=""
                width={112}
                height={40}
                className="h-5 w-auto object-contain object-left"
                aria-hidden
              />
            </div>
            <p className="text-[8px] leading-tight tracking-wide text-white/35 uppercase">
              Restoration &amp; cleaning training · Australia
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
