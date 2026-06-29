import type { ReactNode } from 'react';
import Link from 'next/link';

import {
  marketingBody,
  marketingBtnPrimary,
  marketingEmptyState,
  marketingEyebrowPill,
  marketingFilterPillActive,
  marketingFilterPillInactive,
  marketingFilterPillMutedActive,
  marketingFilterPillMutedInactive,
  marketingHeading,
  marketingHubCtaBanner,
  marketingHubPlaceholder,
  marketingHubSectionLabel,
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
} from '@/lib/marketing/marketing-ui';

export function HubPageHeader({
  eyebrow,
  title,
  description,
  meta,
  eyebrowClassName = marketingEyebrowPill,
}: {
  eyebrow: ReactNode;
  title: string;
  description: string;
  meta?: ReactNode;
  eyebrowClassName?: string;
}) {
  return (
    <header className="mb-10 md:mb-12">
      <div className={`mb-4 inline-flex items-center gap-2 ${eyebrowClassName}`}>{eyebrow}</div>
      <h1 className={`mb-4 ${marketingHeading}`}>{title}</h1>
      <p className={`max-w-2xl ${marketingBody}`}>{description}</p>
      {meta ? (
        <div className={`mt-3 flex flex-wrap items-center gap-4 text-sm ${marketingTextSubtle}`}>
          {meta}
        </div>
      ) : null}
    </header>
  );
}

export function HubCategoryPills({
  basePath,
  categories,
  activeCategory,
  queryParams,
  allLabel = 'All',
}: {
  basePath: string;
  categories: string[];
  activeCategory?: string;
  queryParams?: Record<string, string | undefined>;
  allLabel?: string;
}) {
  const buildHref = (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value) params.set(key, value);
      }
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={buildHref()}
        className={!activeCategory ? marketingFilterPillActive : marketingFilterPillInactive}
      >
        {allLabel}
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat}
          href={buildHref(cat)}
          className={activeCategory === cat ? marketingFilterPillActive : marketingFilterPillInactive}
        >
          {cat}
        </Link>
      ))}
    </div>
  );
}

export function HubFilterPills({
  items,
  activeValue,
  allLabel,
  buildHref,
}: {
  items: { value: string; label: string }[];
  activeValue?: string;
  allLabel: string;
  buildHref: (value?: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={buildHref()}
        className={!activeValue ? marketingFilterPillActive : marketingFilterPillInactive}
      >
        {allLabel}
      </Link>
      {items.map((item) => (
        <Link
          key={item.value}
          href={buildHref(item.value)}
          className={activeValue === item.value ? marketingFilterPillActive : marketingFilterPillInactive}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function HubSecondaryPills({
  items,
  activeValue,
  allLabel,
  buildHref,
}: {
  items: { value: string; label: string }[];
  activeValue?: string;
  allLabel: string;
  buildHref: (value?: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={buildHref()}
        className={!activeValue ? marketingFilterPillMutedActive : marketingFilterPillMutedInactive}
      >
        {allLabel}
      </Link>
      {items.map((item) => (
        <Link
          key={item.value}
          href={buildHref(item.value)}
          className={
            activeValue === item.value ? marketingFilterPillMutedActive : marketingFilterPillMutedInactive
          }
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function HubEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className={marketingEmptyState}>
      <p className={marketingTextMuted}>{children}</p>
    </div>
  );
}

export function HubCtaBanner({
  title,
  description,
  href,
  ctaLabel,
}: {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <div className={`mb-10 ${marketingHubCtaBanner}`}>
      <div>
        <p className={`text-sm font-medium ${marketingTextStrong}`}>{title}</p>
        <p className={`mt-1 text-xs ${marketingTextSubtle}`}>{description}</p>
      </div>
      <Link href={href} className={marketingBtnPrimary}>
        {ctaLabel}
      </Link>
    </div>
  );
}

export function HubPlaceholderCard({ message }: { message: string }) {
  return (
    <div className={marketingHubPlaceholder}>
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/80 dark:bg-white/[0.06]" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200/60 dark:bg-white/[0.04]" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200/50 dark:bg-white/[0.03]" />
      <p className={`mt-auto text-xs ${marketingTextSubtle}`}>{message}</p>
    </div>
  );
}

export function HubSectionLabel({ children }: { children: ReactNode }) {
  return <h2 className={`mb-4 ${marketingHubSectionLabel}`}>{children}</h2>;
}

export function HubSuggestBanner({
  title,
  description,
  href,
  ctaLabel,
}: {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <div className={`mt-16 p-8 text-center ${marketingPanel}`}>
      <h3 className={`mb-2 text-lg font-semibold ${marketingTextStrong}`}>{title}</h3>
      <p className={`mb-4 text-sm ${marketingTextMuted}`}>{description}</p>
      <Link href={href} className={marketingBtnPrimary}>
        {ctaLabel}
      </Link>
    </div>
  );
}
