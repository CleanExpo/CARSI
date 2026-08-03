'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { GrowthPathInfographic } from '@/components/landing/GrowthPathInfographic';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { ccwWorkshopHref, homePathwayItems } from '@/lib/marketing/home-pathways';

/**
 * Editorial pathways and events split. Online courses flowing into in-person Growth Days.
 * Metrics live in {@link HomeTrustStrip}; this section is pathways and events only.
 */
export function HomeGrowthSection() {
  return (
    <section
      aria-labelledby="home-growth-heading"
      className="relative border-t border-slate-200/70 bg-white"
    >
      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
        <div className="grid gap-14 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-20">
          <GrowthPathInfographic className="order-2 lg:order-1" />

          <div className="order-1 lg:order-2">
            <p className={LANDING_EYEBROW_CLASS}>Beyond the catalogue</p>
            <h2 id="home-growth-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Learn online. Grow in person.
            </h2>
            <p className={`mt-4 max-w-md ${LANDING_LEAD_CLASS}`}>
              Self-paced courses are the start, not the ceiling. When you are ready to grow the
              business, join CARSI and CCW Business Growth Days in person.
            </p>

            <ul className="mt-10 divide-y divide-slate-100 border-y border-slate-100">
              {homePathwayItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-start gap-4 py-5 transition hover:bg-[#f8fafc] focus-visible:bg-[#f8fafc] focus-visible:outline-none"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef6fc] text-[#146fc2]">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                          {item.label}
                        </span>
                        <span className="mt-1 block font-semibold text-slate-900 group-hover:text-[#146fc2]">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-500">{item.detail}</span>
                      </span>
                      <ArrowRight
                        className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#146fc2]"
                        aria-hidden
                      />
                      <span className="sr-only">
                        Pathway {index + 1} of {homePathwayItems.length}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Link
              href={ccwWorkshopHref}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
            >
              2-Day Carpet Cleaning Workshop
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
