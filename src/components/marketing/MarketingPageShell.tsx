import type { ReactNode } from 'react';

import { marketingPageBg, marketingPageGlow } from '@/lib/marketing/marketing-ui';

/** Full-width inner padding — no max-width cap (spacious SaaS layout). */
export const marketingPageInnerClass =
  'relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16';

export const marketingPageInnerWideClass = marketingPageInnerClass;

export const marketingPageInnerNarrowClass = marketingPageInnerClass;

interface MarketingPageShellProps {
  children: ReactNode;
  id?: string;
  className?: string;
  innerClassName?: string;
}

/**
 * Theme-aware marketing surface for growth, authority, and industry pages.
 * Respects global light/dark via `.dark` on `<html>`.
 */
export function MarketingPageShell({
  children,
  id,
  className = '',
  innerClassName = marketingPageInnerClass,
}: MarketingPageShellProps) {
  return (
    <main
      id={id}
      className={`relative min-h-screen w-full pt-6 pb-16 sm:pt-8 sm:pb-20 ${marketingPageBg} ${className}`}
    >
      <div className={marketingPageGlow} aria-hidden />
      <div className={innerClassName}>{children}</div>
    </main>
  );
}
