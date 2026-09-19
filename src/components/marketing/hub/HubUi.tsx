import type { ReactNode } from 'react';
import Link from 'next/link';

const pillBase =
  'inline-flex min-h-9 items-center rounded-full border px-3.5 text-[12px] font-medium transition';
const pillActive = `${pillBase} border-[#146fc2] bg-[#146fc2] text-white`;
const pillIdle = `${pillBase} border-slate-200 bg-white text-slate-600 hover:border-[#2490ed]/40 hover:text-[#146fc2]`;

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
      <Link href={buildHref()} className={!activeCategory ? pillActive : pillIdle}>
        {allLabel}
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat}
          href={buildHref(cat)}
          className={activeCategory === cat ? pillActive : pillIdle}
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
      <Link href={buildHref()} className={!activeValue ? pillActive : pillIdle}>
        {allLabel}
      </Link>
      {items.map((item) => (
        <Link
          key={item.value}
          href={buildHref(item.value)}
          className={activeValue === item.value ? pillActive : pillIdle}
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
      <Link href={buildHref()} className={!activeValue ? pillActive : pillIdle}>
        {allLabel}
      </Link>
      {items.map((item) => (
        <Link
          key={item.value}
          href={buildHref(item.value)}
          className={activeValue === item.value ? pillActive : pillIdle}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function HubEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center">
      <p className="text-sm leading-relaxed text-slate-500">{children}</p>
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
    <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 sm:flex-row sm:items-center">
      <div>
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
          {title}
        </p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#146fc2] px-6 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

export function HubPlaceholderCard({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-6">
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/80" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200/60" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200/50" />
      <p className="mt-auto text-xs text-slate-400">{message}</p>
    </div>
  );
}

export function HubSectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-5 text-[11px] font-medium tracking-[0.24em] text-[#146fc2] uppercase">
      {children}
    </h2>
  );
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
    <div className="mt-16 rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
      <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-slate-950">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">{description}</p>
      <Link
        href={href}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#146fc2] px-6 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
