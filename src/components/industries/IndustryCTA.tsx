import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

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
}: IndustryCTAProps) {
  return (
    <section className="relative overflow-hidden border-t border-slate-200/70 bg-[#eef5fb] py-20 md:py-28">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(36,144,237,0.12),transparent_60%)]"
        aria-hidden
      />
      <div className={`relative mx-auto max-w-2xl text-center ${PUBLIC_SHELL_INNER_CLASS}`}>
        <p className={LANDING_EYEBROW_CLASS}>{subtitle}</p>
        <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
          {title} {price}
        </h2>
        <p className={`mx-auto mt-5 max-w-lg ${LANDING_LEAD_CLASS}`}>{description}</p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={ctaHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-8 text-sm font-semibold text-white shadow-[0_14px_40px_-16px_rgba(20,111,194,0.55)] transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200/90 bg-white px-7 text-sm font-semibold text-slate-800 transition hover:border-[#2490ed]/40 hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
          >
            {secondaryText}
          </Link>
        </div>
      </div>
    </section>
  );
}
