import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  featuredIndustryLinks,
  type FeaturedIndustrySlug,
} from '@/lib/marketing/industry-page-data';
import {
  marketingPanel,
  marketingPanelHover,
  marketingSection,
} from '@/lib/marketing/marketing-ui';

interface IndustryCrossLinksProps {
  currentSlug: FeaturedIndustrySlug;
}

export function IndustryCrossLinks({ currentSlug }: IndustryCrossLinksProps) {
  const links = featuredIndustryLinks.filter((item) => item.slug !== currentSlug);

  return (
    <section className={marketingSection}>
      <MarketingSectionHeader
        eyebrow="Industry pathways"
        title="Explore other sectors"
        body="CARSI tailors discipline recommendations, compliance context and course filters for each industry — while keeping the same premium learning experience."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.slug}
              href={item.href}
              className={`group flex h-full flex-col p-5 ${marketingPanel} ${marketingPanelHover}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2490ed]/25 bg-[#2490ed]/10 text-[#7ec5ff]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-[#7ec5ff] uppercase">
                {item.label}
              </p>
              <p className="mt-1 text-base font-semibold text-white/90">{item.title}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{item.detail}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#7ec5ff]">
                View industry page
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
