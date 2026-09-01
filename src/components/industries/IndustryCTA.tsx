import type { CSSProperties } from 'react';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { accentTextVars } from './accentContrast';
import { marketingBtnPrimary } from '@/lib/marketing/marketing-ui';

interface IndustryCTAProps {
  title: string;
  subtitle: string;
  price: string;
  description: string;
  ctaText: string;
  ctaHref?: string;
  secondaryHref?: string;
  secondaryText?: string;
  accentColor: string;
}

export function IndustryCTA({
  title,
  subtitle,
  price,
  description,
  ctaText,
  ctaHref = '/pricing',
  secondaryHref = '/courses',
  secondaryText = 'Browse all courses',
  accentColor,
}: IndustryCTAProps) {
  const accent = accentTextVars(accentColor, 'large');
  return (
    <section className="pt-16 pb-8 md:pt-24">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#0f172a] px-6 py-12 text-center shadow-[0_34px_90px_-45px_rgba(15,23,42,0.8)] sm:px-10 md:py-16"
        style={{ '--industry-accent': accentColor } as CSSProperties}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,color-mix(in_srgb,var(--industry-accent)_28%,transparent),transparent_32%),radial-gradient(circle_at_90%_100%,rgba(36,144,237,0.22),transparent_38%)] opacity-70"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-[11px] font-medium tracking-[0.24em] text-white/55 uppercase">
            {subtitle}
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-[2rem] leading-[1.08] font-semibold tracking-[-0.025em] text-white md:text-[3.2rem]">
            {title}{' '}
            <span
              className="text-[color:var(--carsi-accent-l)]"
              style={{ '--carsi-accent-l': accent.dark } as CSSProperties}
            >
              {price}
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            {description}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={ctaHref} className={marketingBtnPrimary}>
              {ctaText} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white/85 transition hover:border-white/25 hover:bg-white/[0.1]"
            >
              {secondaryText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
