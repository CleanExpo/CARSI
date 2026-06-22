'use client';

import { ArrowRight, Award } from 'lucide-react';
import Link from 'next/link';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import {
  ccwWorkshopHref,
  homePathwayItems,
} from '@/lib/marketing/home-pathways';

/**
 * Homepage spotlight — Start Smart, CCW roadshow booking/program, and in-person workshop.
 * Light-themed to match the current landing page while restoring pre-refactor navigation.
 */
export function HomePathwaysSpotlight() {
  return (
    <section
      aria-labelledby="home-pathways-heading"
      className="border-y border-slate-200 bg-white py-12 md:py-14"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="mb-8 md:mb-9">
          <p
            id="home-pathways-heading"
            className="text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase"
          >
            Also from CARSI
          </p>
          <h2 className="mt-2 max-w-2xl text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
            Learn online, then grow in person with CCW
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Self-paced courses, structured Start Smart guidance, and live Business Growth Days for
            owners ready to scale.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#f8fbff] shadow-sm">
          <ul className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-slate-200">
            {homePathwayItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href} className="border-b border-slate-200 last:border-b-0 md:border-b-0">
                  <Link
                    href={item.href}
                    className={`group flex h-full flex-col px-5 py-6 transition-colors hover:bg-white md:px-6 md:py-7 ${item.borderHoverClass}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${item.accentClass}`} aria-hidden />
                      <span
                        className={`text-[11px] font-semibold tracking-[0.14em] uppercase ${item.accentClass}`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold leading-snug text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.detail}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#146fc2] transition-colors group-hover:text-[#0f5fa8]">
                      {item.cta}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href={ccwWorkshopHref}
            className="group flex flex-col gap-3 border-t border-slate-200 px-5 py-5 transition-colors hover:bg-white sm:flex-row sm:items-center sm:justify-between md:px-6"
          >
            <div className="flex items-start gap-3 sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#b8dbfb] bg-[#eef7ff]">
                <Award className="h-4 w-4 text-[#146fc2]" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase">
                  In-person workshop
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  2-Day Carpet Cleaning Workshop (CCW) — participant resources
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Schedules, materials and cohort access</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#146fc2] transition-colors group-hover:text-[#0f5fa8]">
              View workshop
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
