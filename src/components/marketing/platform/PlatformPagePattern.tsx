import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import { platformRelatedLinks } from '@/lib/marketing/platform-related-links';
import { platformSurfaceByHref, type PlatformSurfacePage } from '@/lib/marketing/platform-surface';

const glowClass = {
  left: 'bg-[radial-gradient(ellipse_70%_55%_at_12%_0%,rgba(36,144,237,0.11),transparent_58%)]',
  right: 'bg-[radial-gradient(ellipse_70%_55%_at_90%_0%,rgba(36,144,237,0.11),transparent_58%)]',
  center: 'bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(36,144,237,0.11),transparent_58%)]',
} as const;

export type PlatformHeroVariant = 'editorial' | 'centered' | 'ledger' | 'catalog';

export function PlatformPageHero({
  current,
  eyebrow,
  title,
  lead,
  variant = 'editorial',
  glow = 'right',
  actions,
  aside,
  pills,
  stats,
}: {
  current: string;
  eyebrow: string;
  title: string;
  lead: string;
  variant?: PlatformHeroVariant;
  glow?: keyof typeof glowClass;
  actions?: ReactNode;
  aside?: ReactNode;
  pills?: ReactNode;
  stats?: { value: string; label: string }[];
}) {
  const shellBg =
    variant === 'ledger'
      ? 'bg-[#f4f7fa] border-slate-200/80'
      : variant === 'catalog'
        ? 'bg-white border-slate-200/70'
        : 'bg-white border-slate-200/70';

  const innerLayout =
    variant === 'centered'
      ? 'mx-auto max-w-3xl text-center'
      : aside
        ? 'grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end'
        : undefined;

  return (
    <section className={`relative overflow-hidden border-b ${shellBg}`}>
      <div className={`pointer-events-none absolute inset-0 ${glowClass[glow]}`} aria-hidden />
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-14 md:py-20`}>
        <div className={innerLayout}>
          <div className={variant === 'centered' ? undefined : undefined}>
            {pills ? (
              <div
                className={`mb-5 flex flex-wrap gap-2 ${variant === 'centered' ? 'justify-center' : ''}`}
              >
                {pills}
              </div>
            ) : null}
            <p className={`${LANDING_EYEBROW_CLASS} ${variant === 'centered' ? 'mx-auto' : ''}`}>
              {eyebrow}
            </p>
            <h1
              className={`mt-3 font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06] ${
                variant === 'centered' ? 'mx-auto max-w-3xl' : 'max-w-4xl'
              }`}
            >
              {title}
            </h1>
            <p
              className={`mt-5 text-pretty ${LANDING_LEAD_CLASS} ${
                variant === 'centered' ? 'mx-auto max-w-2xl' : 'max-w-3xl'
              }`}
            >
              {lead}
            </p>
            <div className={variant === 'centered' ? 'mt-8 flex justify-center' : 'mt-8'}>
              <PlatformNav current={current} />
            </div>
            {actions ? (
              <div
                className={`mt-8 flex flex-wrap gap-3 ${variant === 'centered' ? 'justify-center' : ''}`}
              >
                {actions}
              </div>
            ) : null}
          </div>
          {aside && variant !== 'centered' ? <div>{aside}</div> : null}
        </div>

        {stats && stats.length > 0 ? (
          <div
            className={`mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 ${variant === 'ledger' ? '' : 'md:gap-4'}`}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ${
                  variant === 'ledger' ? 'md:p-5' : ''
                }`}
              >
                <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-950 tabular-nums md:text-[1.65rem]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function PlatformPageHeroFromSurface({
  current,
  variant,
  glow,
  actions,
  aside,
  pills,
  stats,
  overrides,
}: {
  current: string;
  variant?: PlatformHeroVariant;
  glow?: keyof typeof glowClass;
  actions?: ReactNode;
  aside?: ReactNode;
  pills?: ReactNode;
  stats?: { value: string; label: string }[];
  overrides?: Partial<Pick<PlatformSurfacePage, 'eyebrow' | 'headline' | 'lead'>>;
}) {
  const surface = platformSurfaceByHref(current);
  if (!surface) {
    throw new Error(`platform-surface: missing entry for ${current}`);
  }
  return (
    <PlatformPageHero
      current={current}
      variant={variant}
      eyebrow={overrides?.eyebrow ?? surface.eyebrow}
      title={overrides?.headline ?? surface.headline}
      lead={overrides?.lead ?? surface.lead}
      glow={glow}
      actions={actions}
      aside={aside}
      pills={pills}
      stats={stats}
    />
  );
}

export function PlatformPageStatStrip({ stats }: { stats: { value: string; label: string }[] }) {
  return <HomeTrustStrip stats={stats} />;
}

export type PlatformSectionTone = 'white' | 'muted' | 'accent';

const sectionToneClass: Record<PlatformSectionTone, string> = {
  white: 'bg-white',
  muted: 'bg-[#fafbfc]',
  accent: 'bg-[#eef5fb]',
};

export type PlatformSectionLayout = 'stack' | 'wide' | 'split';

export function PlatformPageSection({
  id,
  eyebrow,
  title,
  lead,
  tone = 'white',
  layout = 'stack',
  align = 'left',
  children,
  className = '',
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: PlatformSectionTone;
  layout?: PlatformSectionLayout;
  align?: 'left' | 'center';
  children?: ReactNode;
  className?: string;
}) {
  const leadClass =
    align === 'center'
      ? 'text-center mx-auto max-w-2xl'
      : layout === 'wide'
        ? 'max-w-3xl'
        : 'max-w-2xl';
  return (
    <section
      {...(id ? { 'aria-labelledby': id } : {})}
      className={`border-t border-slate-200/70 py-16 md:py-24 ${sectionToneClass[tone]} ${className}`}
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        {layout === 'split' ? (
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className={LANDING_EYEBROW_CLASS}>{eyebrow}</p>
              <h2 id={id} className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
                {title}
              </h2>
              {lead ? <p className={`mt-4 ${leadClass} ${LANDING_LEAD_CLASS}`}>{lead}</p> : null}
            </div>
            <div>{children}</div>
          </div>
        ) : (
          <>
            <p className={LANDING_EYEBROW_CLASS}>{eyebrow}</p>
            <h2
              id={id}
              className={`mt-3 ${LANDING_DISPLAY_H2_CLASS} ${align === 'center' ? 'mx-auto text-center' : ''}`}
            >
              {title}
            </h2>
            {lead ? <p className={`mt-4 ${leadClass} ${LANDING_LEAD_CLASS}`}>{lead}</p> : null}
            {children}
          </>
        )}
      </div>
    </section>
  );
}

export function PlatformMidCtaBanner({
  title,
  lead,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  tone = 'accent',
}: {
  title: string;
  lead: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tone?: 'accent' | 'dark';
}) {
  const bg = tone === 'dark' ? 'bg-slate-950 text-white' : 'bg-[#eef5fb]';
  const leadColor = tone === 'dark' ? 'text-slate-300' : '';
  return (
    <section className={`border-t border-slate-200/70 py-14 md:py-16 ${bg}`}>
      <div
        className={`${PUBLIC_SHELL_INNER_CLASS} flex flex-col gap-6 md:flex-row md:items-center md:justify-between`}
      >
        <div className="max-w-xl">
          <h2
            className={`font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] md:text-[1.75rem] ${
              tone === 'dark' ? 'text-white' : 'text-slate-950'
            }`}
          >
            {title}
          </h2>
          <p className={`mt-3 ${LANDING_LEAD_CLASS} ${leadColor}`}>{lead}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
          >
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className={`inline-flex min-h-12 items-center justify-center rounded-full border px-7 text-sm font-semibold ${
                tone === 'dark'
                  ? 'border-white/25 text-white hover:bg-white/10'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-[#2490ed]/40 hover:text-[#146fc2]'
              }`}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Three contextual links — unique per page, not an 8-card clone footer. */
export function PlatformContextualNext({ current }: { current: string }) {
  const links = platformRelatedLinks(current);
  if (links.length === 0) return null;

  return (
    <section
      className="border-t border-slate-200/70 bg-white py-14 md:py-16"
      aria-label="Related CARSI surfaces"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Where to next</p>
        <h2 className={`mt-3 max-w-xl ${LANDING_DISPLAY_H2_CLASS}`}>
          Continue on a surface built for this decision
        </h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-5 transition hover:border-[#146fc2]/40 hover:bg-white"
              >
                <span className="text-sm font-semibold text-[#146fc2] group-hover:underline">
                  {item.label}
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {item.detail}
                </span>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-[#146fc2]">
                  Open
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** @deprecated Use PlatformContextualNext — avoids identical 8-up grids on every page. */
export function PlatformEcosystemSection({ current }: { current: string }) {
  return <PlatformContextualNext current={current} />;
}

export function PlatformBentoFeatured({
  featured,
  aside,
}: {
  featured: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-stretch">
      <div className="min-h-[280px]">{featured}</div>
      <div className="flex flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        {aside}
      </div>
    </div>
  );
}
