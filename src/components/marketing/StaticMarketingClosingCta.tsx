import { ArrowRight, Compass, Ticket } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';

/**
 * Closing CTA without client-side motion — avoids empty bands when framer whileInView does not run.
 */
export function StaticMarketingClosingCta() {
  return (
    <section
      aria-labelledby="marketing-closing-cta-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-[#eef5fb] py-20 md:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(36,144,237,0.12),transparent_60%)]"
        aria-hidden
      />
      <div className={`relative mx-auto max-w-2xl text-center ${PUBLIC_SHELL_INNER_CLASS}`}>
        <p className={LANDING_EYEBROW_CLASS}>Get started</p>
        <h2
          id="marketing-closing-cta-heading"
          className="mt-4 font-[family-name:var(--font-display)] text-[2rem] leading-[1.12] font-semibold tracking-[-0.02em] text-slate-950 md:text-[2.6rem] md:leading-[1.08]"
        >
          Your next credential can start tonight
        </h2>
        <p className={`mx-auto mt-5 max-w-lg ${LANDING_LEAD_CLASS}`}>
          Open the catalogue and start a free course now, follow a structured pathway, or book a
          Business Growth Day near you. No classroom required.
        </p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/courses"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-8 text-sm font-semibold text-white shadow-[0_14px_40px_-16px_rgba(20,111,194,0.55)] transition hover:bg-[#0f5fa8]"
          >
            Browse the catalogue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={`${ccwRoadshowPath}#booking`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white px-7 text-sm font-semibold text-slate-800 transition hover:border-[#2490ed]/40 hover:text-[#146fc2]"
          >
            <Ticket className="h-4 w-4" aria-hidden />
            Book Growth Days
          </Link>
          <Link
            href="/pathways"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white px-7 text-sm font-semibold text-slate-800 transition hover:border-[#2490ed]/40 hover:text-[#146fc2]"
          >
            <Compass className="h-4 w-4" aria-hidden />
            Find my pathway
          </Link>
        </div>
      </div>
    </section>
  );
}
