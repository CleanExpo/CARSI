import type { CSSProperties } from 'react';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { accentTextVars } from './accentContrast';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingBodySm,
  marketingEyebrow,
  marketingSection,
  marketingSectionTitle,
} from '@/lib/marketing/marketing-ui';

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
    <section className={marketingSection}>
      <div className="mx-auto max-w-2xl text-center">
        <p className={`mb-3 ${marketingEyebrow}`}>{subtitle}</p>
        <h2 className={marketingSectionTitle}>
          {title}{' '}
          <span
            className="text-[color:var(--carsi-accent-l)] dark:text-[color:var(--carsi-accent-d)]"
            style={{ '--carsi-accent-l': accent.light, '--carsi-accent-d': accent.dark } as CSSProperties}
          >
            {price}
          </span>
        </h2>
        <p className={`mx-auto mt-4 max-w-xl ${marketingBodySm}`}>{description}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={ctaHref} className={marketingBtnPrimary}>
            {ctaText} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href={secondaryHref} className={marketingBtnSecondary}>
            {secondaryText}
          </Link>
        </div>
      </div>
    </section>
  );
}
