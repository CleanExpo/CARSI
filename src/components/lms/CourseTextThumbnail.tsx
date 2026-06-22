'use client';

import { BookOpen, Clock, GraduationCap, Layers, User } from 'lucide-react';
import type { ImgHTMLAttributes } from 'react';

import { IICRC_DISCIPLINE_SHORT } from '@/lib/iicrc-discipline-display';
import { cn } from '@/lib/utils';

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
  variant?: 'card' | 'hero' | 'admin';
  className?: string;
  backdropImageSrc?: string | null;
  backdropImageLoading?: ImgHTMLAttributes<HTMLImageElement>['loading'];
  backdropImageFetchPriority?: ImgHTMLAttributes<HTMLImageElement>['fetchPriority'];
  backdropImageReferrerPolicy?: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  onBackdropImageError?: () => void;
};

function formatLevelLabel(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

function PriceBadge({
  priceLabel,
  isFree,
  hasBackdrop,
}: {
  priceLabel: string;
  isFree?: boolean;
  hasBackdrop: boolean;
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        isFree
          ? hasBackdrop
            ? 'border border-emerald-400/35 bg-black/50 text-emerald-300'
            : 'border border-emerald-500/30 bg-emerald-50 text-emerald-700'
          : hasBackdrop
            ? 'border border-amber-300/35 bg-black/50 text-amber-200'
            : 'border border-amber-500/25 bg-amber-50 text-amber-800'
      )}
    >
      {priceLabel}
    </span>
  );
}

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
  const isCard = variant === 'card';

  const titleClass =
    variant === 'hero'
      ? `font-display text-xl font-bold leading-snug tracking-tight sm:text-2xl ${
          hasBackdrop ? 'text-white' : 'text-slate-950'
        }`
      : variant === 'admin'
        ? `text-sm font-semibold leading-snug ${hasBackdrop ? 'text-white' : 'text-slate-950'}`
        : `text-sm font-bold leading-snug ${hasBackdrop ? 'text-white' : 'text-slate-950'}`;

  const descLines = variant === 'hero' ? 3 : 2;
  const showDesc = !isCard && Boolean(shortDescription?.trim());
  const showModuleCallout =
    !isCard && moduleCount != null && (moduleCount > 0 || variant === 'admin');
  const disciplineLabel = code ? (IICRC_DISCIPLINE_SHORT[code] ?? code) : null;
  const hasCardStats =
    isCard &&
    ((moduleCount != null && moduleCount > 0) ||
      (lessonCount != null && lessonCount > 0) ||
      Boolean(durationHours));

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 w-full flex-col overflow-hidden',
        variant === 'hero' ? 'p-4 sm:p-5' : variant === 'admin' ? 'p-3.5' : 'p-3.5',
        hasBackdrop && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]',
        className
      )}
      style={
        hasBackdrop
          ? { background: '#0a0c10' }
          : {
              background: `linear-gradient(145deg, ${accent.from} 0%, ${accent.via} 52%, ${accent.to} 100%)`,
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
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.35) 45%, transparent 90%)',
              backgroundSize: '18px 100%',
            }}
            aria-hidden
          />
          {isCard && code ? (
            <div
              className="pointer-events-none absolute -right-1 bottom-0 z-0 select-none font-mono text-[4.5rem] font-black leading-none tracking-tighter opacity-[0.07]"
              style={{ color: accent.fg }}
              aria-hidden
            >
              {code}
            </div>
          ) : null}
        </>
      )}

      <div
        className={cn(
          'relative z-1 flex flex-1 flex-col',
          hasBackdrop && '[text-shadow:0_1px_2px_rgba(0,0,0,0.85)]'
        )}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {code ? (
              <span
                className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase"
                style={{
                  color: accent.fg,
                  background: hasBackdrop ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.88)',
                  border: `1px solid ${accent.fg}44`,
                }}
              >
                {code}
              </span>
            ) : null}
            {draft ? (
              <span className="rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-black uppercase">
                Draft
              </span>
            ) : null}
          </div>
          {priceLabel ? (
            <PriceBadge priceLabel={priceLabel} isFree={isFree} hasBackdrop={hasBackdrop} />
          ) : null}
        </div>

        {!isCard ? (
          <>
            {(showCategory || cecHours) && (
              <div className="mb-1.5 flex flex-wrap items-center gap-1">
                {cecHours ? (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[9px] font-semibold tabular-nums',
                      hasBackdrop
                        ? 'border border-white/15 bg-white/10 text-cyan-100'
                        : 'border border-[#2490ed]/25 bg-[#eef7ff] text-[#146fc2]'
                    )}
                  >
                    {cecHours} CEC{cecHours === '1' ? '' : 's'}
                  </span>
                ) : null}
                {showCategory ? (
                  <span
                    className={cn(
                      'line-clamp-1 max-w-full rounded-md px-1.5 py-0.5 text-[9px] font-medium',
                      hasBackdrop
                        ? 'border border-white/12 bg-black/35 text-white/85'
                        : 'border border-slate-200/90 bg-white/80 text-slate-700'
                    )}
                  >
                    {category}
                  </span>
                ) : null}
              </div>
            )}

            <h3 className={cn(titleClass, 'line-clamp-3')}>{title}</h3>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {disciplineLabel ? (
              <p
                className={cn(
                  'text-[11px] font-semibold tracking-wide uppercase',
                  hasBackdrop ? 'text-white/85' : ''
                )}
                style={hasBackdrop ? undefined : { color: accent.fg }}
              >
                {disciplineLabel}
              </p>
            ) : showCategory && category ? (
              <p
                className={cn(
                  'line-clamp-1 text-[11px] font-semibold tracking-wide uppercase',
                  hasBackdrop ? 'text-white/85' : 'text-slate-600'
                )}
              >
                {category}
              </p>
            ) : null}

            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {level ? (
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase',
                    hasBackdrop
                      ? 'border border-white/15 bg-black/35 text-white/90'
                      : 'border border-slate-200/90 bg-white/85 text-slate-700'
                  )}
                >
                  {formatLevelLabel(level)}
                </span>
              ) : null}
              {cecHours ? (
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[9px] font-semibold tabular-nums',
                    hasBackdrop
                      ? 'border border-cyan-300/25 bg-black/35 text-cyan-100'
                      : 'border border-[#2490ed]/25 bg-[#eef7ff] text-[#146fc2]'
                  )}
                >
                  {cecHours} CEC{cecHours === '1' ? '' : 's'}
                </span>
              ) : null}
            </div>

            {shortDescription?.trim() ? (
              <p
                className={cn(
                  'mt-2 line-clamp-3 text-[11px] leading-relaxed',
                  hasBackdrop ? 'text-white/80' : 'text-slate-700'
                )}
              >
                {shortDescription}
              </p>
            ) : (
              <h3
                className={cn(
                  'mt-2 line-clamp-3 text-sm font-bold leading-snug',
                  hasBackdrop ? 'text-white' : 'text-slate-950'
                )}
              >
                {title}
              </h3>
            )}

            {hasCardStats ? (
              <div
                className={cn(
                  'mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t pt-2 text-[10px] font-medium',
                  hasBackdrop
                    ? 'border-white/12 text-white/75'
                    : 'border-slate-200/90 text-slate-600'
                )}
              >
                {moduleCount != null && moduleCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3 w-3 shrink-0 opacity-75" style={{ color: accent.fg }} />
                    {moduleCount} mod{moduleCount === 1 ? '' : 's'}
                  </span>
                ) : null}
                {lessonCount != null && lessonCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3 w-3 shrink-0 opacity-75" />
                    {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
                  </span>
                ) : null}
                {durationHours ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0 opacity-75" />
                    {durationHours}h
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {showModuleCallout ? (
          <div
            className={cn(
              'mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-2 py-1.5',
              hasBackdrop
                ? 'border border-white/10 bg-black/28'
                : 'border border-slate-200/90 bg-white/75'
            )}
          >
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-bold tabular-nums',
                hasBackdrop ? 'text-white' : 'text-slate-900'
              )}
            >
              <Layers className="h-3.5 w-3.5" style={{ color: accent.fg }} />
              {moduleCount} module{moduleCount === 1 ? '' : 's'}
            </span>
            {lessonCount != null && lessonCount > 0 ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-medium',
                  hasBackdrop ? 'text-white/70' : 'text-slate-600'
                )}
              >
                <BookOpen className="h-3 w-3 opacity-70" />
                {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        ) : null}

        {showDesc ? (
          <p
            className={cn(
              'mt-2 text-[11px] leading-relaxed',
              hasBackdrop ? 'text-white/70' : 'text-slate-600'
            )}
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

        {!isCard ? (
          <div
            className={cn(
              'mt-auto flex flex-wrap gap-x-2.5 gap-y-1 border-t pt-2 text-[9px]',
              hasBackdrop ? 'border-white/10 text-white/70' : 'border-slate-200 text-slate-600'
            )}
          >
            {level ? (
              <span className="inline-flex items-center gap-1">
                <GraduationCap
                  className={cn(
                    'h-3 w-3 shrink-0',
                    hasBackdrop ? 'text-white/45' : 'text-slate-400'
                  )}
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
                  className={cn(
                    'h-3 w-3 shrink-0',
                    hasBackdrop ? 'text-white/45' : 'text-slate-400'
                  )}
                />
                {durationHours}h
              </span>
            ) : null}
            {instructorName ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <User
                  className={cn(
                    'h-3 w-3 shrink-0',
                    hasBackdrop ? 'text-white/45' : 'text-slate-400'
                  )}
                />
                <span className="truncate">{instructorName}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
