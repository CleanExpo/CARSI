import type { ReactNode } from 'react';

import { marketingPageGlow } from '@/lib/marketing/marketing-ui';

export const marketingPageInnerClass =
  'relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10';

export const marketingPageInnerWideClass =
  'relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10';

export const marketingPageInnerNarrowClass =
  'relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6';

interface MarketingPageShellProps {
  children: ReactNode;
  id?: string;
  className?: string;
  innerClassName?: string;
}

/**
 * Dark marketing surface shared by roadshow, Start Smart, workshop, and authority pages.
 * Pairs with the light public layout + dark chrome nav/footer (same pattern as homepage body).
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
      className={`relative min-h-screen pb-16 pt-6 text-white sm:pb-20 sm:pt-8 ${className}`}
      style={{ background: '#060a14' }}
    >
      <div className={marketingPageGlow} aria-hidden />
      <div className={innerClassName}>{children}</div>
    </main>
  );
}
