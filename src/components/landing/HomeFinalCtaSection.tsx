'use client';

import { CheckCircle2, Compass, ShieldCheck, Ticket } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';

/**
 * Immersive final CTA — full-bleed dark band with atmosphere (not a flat slate strip).
 */
export function HomeFinalCtaSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-final-cta-heading"
      className="relative overflow-hidden bg-[#0a1628] py-20 text-white md:py-28 dark:bg-[#020617]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_20%_50%,rgba(36,144,237,0.28),transparent_55%),radial-gradient(ellipse_50%_60%_at_90%_20%,rgba(237,157,36,0.18),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#2490ed]/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#146fc2]/20 blur-3xl"
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#8fd0ff]">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Built for practical professional development
          </p>
          <h2
            id="home-final-cta-heading"
            className="mt-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
          >
            Ready to start — online, in person, or both?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
            Browse the catalogue for self-paced CEC courses, follow a structured pathway, or book
            CARSI × CCW Business Growth Days when you are ready to grow in person.
          </p>

          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/courses"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ed9d24] px-7 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_40px_-12px_rgba(237,157,36,0.7)] transition hover:-translate-y-0.5 hover:bg-[#f2b14f] focus-visible:ring-2 focus-visible:ring-[#ed9d24]/50 focus-visible:outline-none"
            >
              Browse the catalogue
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={`${ccwRoadshowPath}#booking`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
            >
              Book Growth Days
              <Ticket className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/pathways"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
            >
              Find my pathway
              <Compass className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
