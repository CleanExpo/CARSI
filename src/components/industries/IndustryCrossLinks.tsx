import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import {
  featuredIndustryLinks,
  type FeaturedIndustrySlug,
} from '@/lib/marketing/industry-page-data';

interface IndustryCrossLinksProps {
  currentSlug: FeaturedIndustrySlug;
}

export function IndustryCrossLinks({ currentSlug }: IndustryCrossLinksProps) {
  const links = featuredIndustryLinks.filter((item) => item.slug !== currentSlug);

  return (
    <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Industry pathways</p>
        <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Explore other sectors</h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          Move between sector job contexts while keeping the same CARSI course record, dashboard and
          verified completion pathway.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.slug}
                href={item.href}
                className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-[#2490ed]/35 hover:shadow-[0_18px_40px_-24px_rgba(20,111,194,0.35)]"
              >
                <Icon className="h-5 w-5 text-[#146fc2]" aria-hidden />
                <p className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase">
                  {item.label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950 group-hover:text-[#146fc2]">
                  {item.title}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{item.detail}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#146fc2]">
                  View industry page
                  <ArrowRight
                    className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
