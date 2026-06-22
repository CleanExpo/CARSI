import type { ReactNode } from 'react';

import {
  MarketingPageShell,
  marketingPageInnerWideClass,
} from '@/components/marketing/MarketingPageShell';

interface IndustryPageLayoutProps {
  children: ReactNode;
}

/** Dark industry surface aligned with homepage chrome and marketing pages. */
export function IndustryPageLayout({ children }: IndustryPageLayoutProps) {
  return (
    <MarketingPageShell innerClassName={marketingPageInnerWideClass}>{children}</MarketingPageShell>
  );
}
