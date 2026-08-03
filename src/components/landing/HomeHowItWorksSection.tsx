'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, BadgeCheck, BookOpen, Clock } from 'lucide-react';
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

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Light cinematic steps — oversized numerals, no dark journey panel chrome.
 */
export function HomeHowItWorksSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-how-it-works-heading"
      className="relative border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="max-w-xl">
          <p className="text-[11px] font-medium tracking-[0.22em] text-[#146fc2] uppercase">
            How it works
          </p>
          <h2
            id="home-how-it-works-heading"
            className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-slate-950 md:text-4xl"
          >
            From enrolment to certificate
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            Find the right course, complete self-paced lessons, track CECs, and share verifiable
            credentials when your work requires proof.
          </p>
          <Link
            href="/pathways"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
          >
            Browse structured pathways
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.li
                key={item.title}
                className="relative"
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ ...spring, delay: index * 0.08 }}
              >
                <span
                  className="pointer-events-none absolute -top-6 left-0 font-[family-name:var(--font-display)] text-6xl font-bold tracking-tighter text-slate-950/[0.05]"
                  aria-hidden
                >
                  {item.step}
                </span>
                <Icon className="relative h-5 w-5 text-[#146fc2]" aria-hidden />
                <h3 className="relative mt-4 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                  <span className="sr-only">Step {item.step}. </span>
                  {item.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-500">{item.text}</p>
              </motion.li>
            );
          })}
        </ol>

        <div className="mt-16 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
          <p className="mb-6 text-center text-sm text-slate-500">
            From enrolment to credential — six steps to recognised professional development.
          </p>
          <StudentJourneyMap />
        </div>
      </div>
    </section>
  );
}
