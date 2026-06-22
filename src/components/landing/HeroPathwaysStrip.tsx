'use client';

import { ArrowRight, Award } from 'lucide-react';
import Link from 'next/link';

import {
  ccwWorkshopHref,
  homePathwayItems,
} from '@/lib/marketing/home-pathways';

/** Compact pathways strip — embedded inside the homepage hero on large screens. */
export function HeroPathwaysStrip() {
  return (
    <div aria-label="CARSI pathways and events" className="mt-10 lg:mt-0">
      <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
        Also explore
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ul className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
          {homePathwayItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href} className="border-b border-slate-200 last:border-b-0 sm:border-b-0">
                <Link
                  href={item.href}
                  className="group flex h-full flex-col px-4 py-4 transition-colors hover:bg-[#f8fbff] sm:px-4 sm:py-5"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${item.accentClass}`} aria-hidden />
                    <span
                      className={`text-[10px] font-semibold tracking-[0.14em] uppercase ${item.accentClass}`}
                    >
                      {item.label}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-semibold leading-snug text-slate-950">{item.title}</h3>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{item.detail}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#146fc2] group-hover:text-[#0f5fa8]">
                    {item.cta}
                    <ArrowRight
                      className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
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
          className="group flex flex-col gap-2 border-t border-slate-200 px-4 py-3.5 transition-colors hover:bg-[#f8fbff] sm:flex-row sm:items-center sm:justify-between sm:px-4"
        >
          <div className="flex items-center gap-3">
            <Award className="h-3.5 w-3.5 shrink-0 text-[#146fc2]" aria-hidden />
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase">
                In-person workshop
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-800">
                2-Day Carpet Cleaning Workshop (CCW)
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#146fc2] group-hover:text-[#0f5fa8]">
            View workshop
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      </div>
    </div>
  );
}
