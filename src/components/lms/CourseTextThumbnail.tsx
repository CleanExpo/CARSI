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
    fg: '#146fc2',
    glow: 'rgba(36,144,237,0.22)',
    from: '#eef7ff',
    via: '#dceeff',
    to: '#ffffff',
  },
  CRT: {
    fg: '#047f6f',
    glow: 'rgba(38,196,160,0.2)',
    from: '#ecfdf7',
    via: '#d7fbef',
    to: '#ffffff',
  },
  ASD: {
    fg: '#4f46e5',
    glow: 'rgba(108,99,255,0.18)',
    from: '#f0f1ff',
    via: '#e3e5ff',
    to: '#ffffff',
  },
  OCT: {
    fg: '#7e3ba0',
    glow: 'rgba(155,89,182,0.18)',
    from: '#fbf0ff',
    via: '#f1ddfb',
    to: '#ffffff',
  },
  CCT: {
    fg: '#0f7890',
    glow: 'rgba(23,184,212,0.18)',
    from: '#ecfbff',
    via: '#d9f6fb',
    to: '#ffffff',
  },
  FSRT: {
    fg: '#c2410c',
    glow: 'rgba(240,90,53,0.18)',
    from: '#fff4ed',
    via: '#ffe3d2',
    to: '#ffffff',
  },
  AMRT: {
    fg: '#15803d',
    glow: 'rgba(39,174,96,0.18)',
    from: '#f0fdf4',
    via: '#dcfce7',
    to: '#ffffff',
  },
};

const CATEGORY_ACCENTS: { test: (c: string) => boolean; key: string }[] = [
  { test: (c) => /safety|ppe/i.test(c), key: 'safety' },
  { test: (c) => /whs|compliance/i.test(c), key: 'whs' },
  { test: (c) => /marketing|business/i.test(c), key: 'mkt' },
];

const EXTRA_ACCENTS: Record<string, (typeof DISCIPLINE_ACCENTS)['WRT']> = {
  safety: {
    fg: '#a16207',
    glow: 'rgba(240,180,41,0.18)',
    from: '#fff8e6',
    via: '#fff1c2',
    to: '#ffffff',
  },
  whs: {
    fg: '#0369a1',
    glow: 'rgba(125,211,252,0.18)',
    from: '#eff9ff',
    via: '#dff3ff',
    to: '#ffffff',
  },
  mkt: {
    fg: '#be185d',
    glow: 'rgba(244,114,182,0.18)',
    from: '#fff1f7',
    via: '#ffe1ee',
    to: '#ffffff',
  },
};

function hashHue(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i += 1) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return h % 360;
}

function inferDisciplineCode(
  category: string | null | undefined,
  discipline: string | null | undefined
) {
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
    fg: `hsl(${hue} 64% 34%)`,
    glow: `hsla(${hue}, 70%, 50%, 0.16)`,
    from: `hsl(${hue} 80% 96%)`,
    via: `hsl(${(hue + 12) % 360} 78% 92%)`,
    to: '#ffffff',
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
  /** Show CARSI logo and brand line on thumbnails (off for homepage featured grid). */
  showBrand?: boolean;
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
  showBrand = true,
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
      ? `font-display text-xl font-bold leading-snug tracking-tight sm:text-2xl ${
          hasBackdrop ? 'text-white' : 'text-slate-950'
        }`
      : variant === 'admin'
        ? `text-sm font-semibold leading-snug ${hasBackdrop ? 'text-white' : 'text-slate-950'}`
        : `text-sm font-bold leading-snug ${hasBackdrop ? 'text-white' : 'text-slate-950'}`;

  const descLines = variant === 'hero' ? 3 : 2;
  const showDesc = variant !== 'card' && Boolean(shortDescription?.trim());

  const logoH = variant === 'hero' ? 32 : variant === 'admin' ? 28 : 26;
  const showModuleCallout =
    variant !== 'card' && moduleCount != null && (moduleCount > 0 || variant === 'admin');
  const showBrandRow = showBrand || Boolean(priceLabel);

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
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 18px 40px -28px ${accent.glow}`,
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
            className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-black/58 via-black/28 to-black/68"
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
            className="pointer-events-none absolute -top-12 -right-8 h-40 w-40 rounded-full blur-3xl"
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
        {showBrandRow ? (
          <div
            className={cn(
              'mb-2 flex items-start gap-2',
              showBrand ? 'justify-between' : 'justify-end'
            )}
          >
            {showBrand ? (
              <div className="relative min-w-0 shrink pt-0.5" style={{ height: logoH }}>
                <Image
                  src={CARSI_COURSE_LOGO_SRC}
                  alt="CARSI"
                  width={140}
                  height={48}
                  className="h-full w-auto max-w-[min(100%,9.5rem)] object-contain object-left drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
                />
              </div>
            ) : null}
            {priceLabel ? (
              <span
                className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums"
                style={
                  isFree
                    ? {
                        color: '#5ee9a0',
                        background: hasBackdrop ? 'rgba(0,0,0,0.5)' : 'rgba(16,185,129,0.12)',
                        border: hasBackdrop
                          ? '1px solid rgba(94,233,160,0.35)'
                          : '1px solid rgba(16,185,129,0.35)',
                      }
                    : {
                        color: hasBackdrop ? '#f5c15c' : '#9a4a00',
                        background: hasBackdrop ? 'rgba(0,0,0,0.5)' : 'rgba(237,157,36,0.12)',
                        border: hasBackdrop
                          ? '1px solid rgba(245,193,92,0.35)'
                          : '1px solid rgba(237,157,36,0.35)',
                        boxShadow: hasBackdrop ? '0 0 14px rgba(237,157,36,0.15)' : undefined,
                      }
                }
              >
                {priceLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Discipline / category / draft */}
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          {code && (
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide uppercase"
              style={{
                color: accent.fg,
                background: hasBackdrop ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.82)',
                border: `1px solid ${accent.fg}55`,
                boxShadow: `0 8px 18px -14px ${accent.glow}`,
              }}
            >
              IICRC {code}
            </span>
          )}
          {cecHours && variant === 'card' ? (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
              style={{
                color: '#146fc2',
                background: hasBackdrop ? 'rgba(255,255,255,0.16)' : '#eef7ff',
                border: '1px solid rgba(36,144,237,0.28)',
              }}
            >
              {cecHours} CEC{cecHours === '1' ? '' : 's'}
            </span>
          ) : null}
          {showCategory && (
            <span
              className={`line-clamp-1 max-w-full rounded px-1.5 py-0.5 text-[9px] font-medium ${
                hasBackdrop ? 'text-white/85' : 'text-slate-700'
              }`}
              style={{
                background: hasBackdrop ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.72)',
                border: hasBackdrop
                  ? '1px solid rgba(255,255,255,0.12)'
                  : '1px solid rgba(15,23,42,0.1)',
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

        {variant === 'card' ? null : <h3 className={cn(titleClass, 'line-clamp-3')}>{title}</h3>}

        {showModuleCallout ? (
          <div
            className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-2 py-1.5"
            style={{
              background: hasBackdrop ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.74)',
              border: hasBackdrop
                ? '1px solid rgba(255,255,255,0.1)'
                : '1px solid rgba(15,23,42,0.1)',
            }}
          >
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold tabular-nums ${
                hasBackdrop ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" style={{ color: accent.fg }} />
              {moduleCount} module{moduleCount === 1 ? '' : 's'}
            </span>
            {lessonCount != null && lessonCount > 0 ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                  hasBackdrop ? 'text-white/70' : 'text-slate-600'
                }`}
              >
                <BookOpen className="h-3 w-3 opacity-70" />
                {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        ) : null}

        {showDesc ? (
          <p
            className={`mt-2 text-[11px] leading-relaxed ${
              hasBackdrop ? 'text-white/70' : 'text-slate-600'
            }`}
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

        <div
          className={`mt-auto flex flex-wrap gap-x-2.5 gap-y-1 border-t pt-2 text-[9px] ${
            hasBackdrop ? 'border-white/10 text-white/70' : 'border-slate-200 text-slate-600'
          }`}
        >
          {level ? (
            <span className="inline-flex items-center gap-1">
              <GraduationCap
                className={`h-3 w-3 shrink-0 ${hasBackdrop ? 'text-white/45' : 'text-slate-400'}`}
              />
              {level}
            </span>
          ) : null}
          {cecHours ? (
            <span className={hasBackdrop ? 'text-cyan-200' : 'text-[#146fc2]'}>
              {cecHours} IICRC CEC{cecHours === '1' ? '' : 's'}
            </span>
          ) : null}
          {durationHours ? (
            <span className="inline-flex items-center gap-1">
              <Clock
                className={`h-3 w-3 shrink-0 ${hasBackdrop ? 'text-white/45' : 'text-slate-400'}`}
              />
              {durationHours}h
            </span>
          ) : null}
          {instructorName ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <User
                className={`h-3 w-3 shrink-0 ${hasBackdrop ? 'text-white/45' : 'text-slate-400'}`}
              />
              <span className="truncate">{instructorName}</span>
            </span>
          ) : null}
        </div>

        {variant === 'card' && showBrand ? (
          <p
            className={`mt-1.5 truncate text-[7px] tracking-wide uppercase ${hasBackdrop ? 'text-white/45' : 'text-slate-500'}`}
          >
            CARSI · Restoration training · Australia
          </p>
        ) : variant !== 'card' && showBrand ? (
          <div
            className={`mt-2 flex items-center gap-2 border-t pt-2 ${hasBackdrop ? 'border-white/5' : 'border-slate-200'}`}
          >
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
            <p
              className={`text-[8px] leading-tight tracking-wide uppercase ${hasBackdrop ? 'text-white/45' : 'text-slate-500'}`}
            >
              Restoration &amp; cleaning training · Australia
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
