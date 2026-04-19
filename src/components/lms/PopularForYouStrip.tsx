'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { RenewalCourseSuggestion } from '@/types/renewal';

export function PopularForYouStrip({ courses }: { courses: RenewalCourseSuggestion[] }) {
  if (courses.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6 sm:px-8" aria-label="Popular for you">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-300/90" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight text-white">Popular for you</h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/40">
          Based on your renewal mix &amp; onboarding
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {courses.map((c) => (
          <div
            key={c.id}
            className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-white/10 bg-[#060a14] p-4"
          >
            {c.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumbnail_url} alt="" className="mb-3 h-24 w-full rounded-lg object-cover" />
            ) : (
              <div className="mb-3 flex h-24 w-full items-center justify-center rounded-lg bg-[#2490ed]/10">
                <span className="font-mono text-xs text-[#2490ed]/50">
                  {c.iicrc_discipline ?? 'CARSI'}
                </span>
              </div>
            )}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {c.iicrc_discipline ? (
                <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#2490ed] uppercase bg-[#2490ed]/15">
                  {c.iicrc_discipline}
                </span>
              ) : null}
              {c.cec_hours != null ? (
                <span className="font-mono text-[10px] text-white/35">{c.cec_hours} CEC hrs</span>
              ) : null}
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold text-white">{c.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs italic text-white/40">{c.reason}</p>
            <Link
              href={`/dashboard/learn/${encodeURIComponent(c.slug)}`}
              className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-[#2490ed]/90 px-3 py-2 text-xs font-medium text-white transition hover:bg-[#1f82d4]"
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
