'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Compass, Ticket } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Light closing CTA. Soft ice blue band, not a dark immersive strip.
 */
export function HomeFinalCtaSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-final-cta-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-[#eef5fb] py-20 md:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(36,144,237,0.12),transparent_60%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_70%_80%_at_50%_50%,black,transparent)]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={spring}
        >
          <p className={LANDING_EYEBROW_CLASS}>Get started</p>
          <h2
            id="home-final-cta-heading"
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
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-8 text-sm font-semibold text-white shadow-[0_14px_40px_-16px_rgba(20,111,194,0.55)] transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
            >
              Browse the catalogue
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href={`${ccwRoadshowPath}#booking`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white px-7 text-sm font-semibold text-slate-800 transition hover:border-[#2490ed]/40 hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
            >
              <Ticket className="h-4 w-4" aria-hidden />
              Book Growth Days
            </Link>
            <Link
              href="/pathways"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white px-7 text-sm font-semibold text-slate-800 transition hover:border-[#2490ed]/40 hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
            >
              <Compass className="h-4 w-4" aria-hidden />
              Find my pathway
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
