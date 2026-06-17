'use client';

import { ArrowRight, Award, Compass, Sparkles, Ticket } from 'lucide-react';
import Link from 'next/link';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
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

export function HomeSpotlightFeatures() {
  return (
    <section
      aria-labelledby="home-spotlight-heading"
      className="border-t border-white/6 py-12 md:py-14"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="mb-8 md:mb-9">
          <p
            id="home-spotlight-heading"
            className="text-[11px] font-semibold tracking-[0.2em] text-white/35 uppercase"
          >
            Also from CARSI
          </p>
          <p className="mt-2 max-w-2xl text-lg font-medium tracking-tight text-white/90 md:text-xl">
            Learn online, then grow in person with CCW.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
          <ul className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-white/8">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href} className="border-b border-white/8 last:border-b-0 md:border-b-0">
                  <Link
                    href={item.href}
                    className="group flex h-full flex-col px-5 py-6 transition-colors hover:bg-white/[0.03] md:px-6 md:py-7"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${item.accent}`} aria-hidden />
                      <span className={`text-[11px] font-semibold tracking-[0.14em] uppercase ${item.accent}`}>
                        {item.label}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold leading-snug text-white">{item.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-white/45">{item.detail}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors group-hover:text-white">
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
            href="/ccw-training"
            className="group flex flex-col gap-3 border-t border-white/8 px-5 py-5 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between md:px-6"
          >
            <div className="flex items-start gap-3 sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                <Award className="h-4 w-4 text-[#7ec5ff]" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#2490ed]/90 uppercase">
                  In-person workshop
                </p>
                <p className="mt-1 text-sm font-medium text-white/88">
                  2-Day Carpet Cleaning Workshop (CCW) — participant resources
                </p>
                <p className="mt-0.5 text-xs text-white/40">Schedules, materials and cohort access</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-white/65 transition-colors group-hover:text-white">
              View workshop
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
