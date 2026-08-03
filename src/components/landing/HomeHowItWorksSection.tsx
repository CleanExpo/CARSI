'use client';

import { ArrowRight, Award, BadgeCheck, BookOpen, Clock } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';

const STEPS = [
  {
    icon: BookOpen,
    step: '01',
    title: 'Browse by need',
    text: 'Search by discipline, level, CEC hours, free courses, or course outcome.',
  },
  {
    icon: Clock,
    step: '02',
    title: 'Learn around jobs',
    text: 'Resume lessons whenever the roster allows, on desktop or mobile.',
  },
  {
    icon: Award,
    step: '03',
    title: 'Track CECs',
    text: 'Keep progress and continuing education details visible in your dashboard.',
  },
  {
    icon: BadgeCheck,
    step: '04',
    title: 'Share credentials',
    text: 'Use certificates and verification pages for employers, clients, or renewal.',
  },
] as const;

/**
 * Cinematic how-it-works — large step numerals + sequential reveal (not a flat 2×2 card grid).
 */
export function HomeHowItWorksSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-how-it-works-heading"
      className="relative overflow-hidden border-t border-slate-200/80 bg-white py-16 md:py-24 dark:border-white/10 dark:bg-[#0a0a0a]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_100%,rgba(20,111,194,0.08),transparent_55%)] dark:bg-[radial-gradient(ellipse_60%_50%_at_0%_100%,rgba(36,144,237,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#8fd0ff]">
            How it works
          </p>
          <h2
            id="home-how-it-works-heading"
            className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white"
          >
            A clearer path from enrolment to certificate
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/65">
            Find the right course, complete self-paced lessons, track CECs, and share verifiable
            credentials when your work requires proof.
          </p>
          <Link
            href="/pathways"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 hover:text-[#0f5fa8] dark:text-[#8fd0ff] dark:hover:text-[#b8e2ff]"
          >
            Browse structured pathways
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.li
                key={item.title}
                className="relative flex flex-col border-t-2 border-[#146fc2]/40 pt-6 dark:border-[#2490ed]/45"
                initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <span
                  className="pointer-events-none absolute -top-1 right-0 select-none text-5xl font-bold leading-none tracking-tighter text-slate-100 dark:text-white/[0.06]"
                  aria-hidden
                >
                  {item.step}
                </span>
                <Icon className="relative h-5 w-5 text-[#146fc2] dark:text-[#8fd0ff]" aria-hidden />
                <h3 className="relative mt-4 text-base font-bold text-slate-950 dark:text-white">
                  {item.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                  {item.text}
                </p>
              </motion.li>
            );
          })}
        </ol>

        <div className="mt-14 overflow-hidden rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.9)] sm:p-8">
          <p className="mb-6 text-center text-sm leading-relaxed text-slate-300">
            From enrolment to credential — six steps to recognised professional development.
          </p>
          <StudentJourneyMap />
        </div>
      </div>
    </section>
  );
}
