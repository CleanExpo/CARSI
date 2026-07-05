'use client';

import type { RenewalCourseSuggestion } from '@/types/renewal';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { dash } from '@/lib/dashboard-light-ui';

export function PopularForYouStrip({ courses }: { courses: RenewalCourseSuggestion[] }) {
  if (courses.length === 0) return null;

  return (
    <section className={`${dash.card} px-5 py-6 sm:px-8`} aria-label="Popular for you">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">Popular for you</h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          Based on your renewal mix &amp; onboarding
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {courses.map((c) => (
          <div
            key={c.id}
            className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {c.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.thumbnail_url}
                alt=""
                className="mb-3 h-24 w-full rounded-lg object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="mb-3 flex h-24 w-full items-center justify-center rounded-lg bg-[#eef7ff]">
                <span className="font-mono text-xs text-[#146fc2]/70">
                  {c.iicrc_discipline ?? 'CARSI'}
                </span>
              </div>
            )}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {c.iicrc_discipline ? (
                <span className="rounded bg-[#eef7ff] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#146fc2] uppercase">
                  {c.iicrc_discipline}
                </span>
              ) : null}
              {c.cec_hours != null ? (
                <span className="font-mono text-[10px] text-slate-500">{c.cec_hours} CEC hrs</span>
              ) : null}
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{c.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 italic">{c.reason}</p>
            <Link
              href={`/dashboard/learn/${encodeURIComponent(c.slug)}`}
              className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-[#146fc2] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#0f5fa8]"
            >
              Open course
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
