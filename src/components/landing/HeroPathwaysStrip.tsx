'use client';

import { ArrowRight, Award, Compass, Sparkles, Ticket } from 'lucide-react';
import Link from 'next/link';

import { ccwRoadshowPath, formatAudFromCents, ccwRoadshowTicketPackages } from '@/lib/marketing/ccw-roadshow';
import { startSmartBasePath } from '@/lib/marketing/start-smart';

const singlePrice = formatAudFromCents(ccwRoadshowTicketPackages[0].unitAmountCents);
const teamPrice = formatAudFromCents(ccwRoadshowTicketPackages[1].unitAmountCents);

const items = [
  {
    href: startSmartBasePath,
    label: 'Start Smart',
    title: 'Start a carpet cleaning business',
    detail: '8 sub-pillars · equipment, chemistry, quoting & trust',
    cta: 'Explore pathway',
    icon: Compass,
    accent: 'text-[#ed9d24]',
  },
  {
    href: `${ccwRoadshowPath}#booking`,
    label: 'Book Growth Days',
    title: 'Melbourne 22–23 Jul · Sydney 30–31 Jul',
    detail: `${singlePrice} per seat · ${teamPrice} for 5 · Stripe checkout`,
    cta: 'Book your seat',
    icon: Ticket,
    accent: 'text-[#34d399]',
  },
  {
    href: ccwRoadshowPath,
    label: 'Roadshow program',
    title: 'CARSI × CCW Business Growth Days',
    detail: 'Why attend, who it’s for, venues & daily focus',
    cta: 'View program',
    icon: Sparkles,
    accent: 'text-[#7ec5ff]',
  },
] as const;

/** Minimal pathway links — sits inside the homepage hero. */
export function HeroPathwaysStrip() {
  return (
    <div aria-label="CARSI pathways and events">
      <p className="mb-4 text-[11px] font-semibold tracking-[0.18em] text-white/35 uppercase">
        Also explore
      </p>

      <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] backdrop-blur-sm">
        <ul className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-white/8">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href} className="border-b border-white/8 last:border-b-0 md:border-b-0">
                <Link
                  href={item.href}
                  className="group flex h-full flex-col px-4 py-5 transition-colors hover:bg-white/[0.03] sm:px-5"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${item.accent}`} aria-hidden />
                    <span
                      className={`text-[10px] font-semibold tracking-[0.14em] uppercase ${item.accent}`}
                    >
                      {item.label}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold leading-snug text-white">{item.title}</h3>
                  <p className="mt-1.5 flex-1 text-xs leading-relaxed text-white/42">{item.detail}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-white/60 transition-colors group-hover:text-white">
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
          href="/ccw-training"
          className="group flex flex-col gap-2 border-t border-white/8 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="flex items-center gap-3">
            <Award className="h-3.5 w-3.5 shrink-0 text-[#7ec5ff]" aria-hidden />
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#2490ed]/90 uppercase">
                In-person workshop
              </p>
              <p className="mt-0.5 text-xs font-medium text-white/80">
                2-Day Carpet Cleaning Workshop (CCW) — participant resources
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-white/55 group-hover:text-white">
            View workshop
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      </div>
    </div>
  );
}
