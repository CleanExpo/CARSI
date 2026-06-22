import type { ReactNode } from 'react';

import { MarketingPageShell, marketingPageInnerNarrowClass } from '@/components/marketing/MarketingPageShell';
import {
  marketingLegalArticle,
  marketingLegalProse,
  marketingTextSubtle,
} from '@/lib/marketing/marketing-ui';

export {
  marketingLegalH2,
  marketingLegalH3,
  marketingLegalProse,
  marketingLink,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';

interface LegalDocumentShellProps {
  title: string;
  updated: string;
  children: ReactNode;
}

export function LegalDocumentShell({ title, updated, children }: LegalDocumentShellProps) {
  return (
    <MarketingPageShell id="main-content" innerClassName={marketingPageInnerNarrowClass}>
      <article className={marketingLegalArticle}>
        <header className="mb-10 border-b border-slate-200/80 pb-8 dark:border-white/[0.08]">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
            {title}
          </h1>
          <p className={`mt-2 text-sm ${marketingTextSubtle}`}>Last updated: {updated}</p>
        </header>
        <div className={marketingLegalProse}>{children}</div>
      </article>
    </MarketingPageShell>
  );
}
