'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, BadgeCheck, BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
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
 * Horizontal process on desktop, vertical on mobile. A hairline rail connects
 * four numbered circle nodes, with a crafted feel beyond plain columns.
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
          <p className={LANDING_EYEBROW_CLASS}>How it works</p>
          <h2 id="home-how-it-works-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Four steps from sign up to proof
          </h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
            No classrooms, no waiting lists. Pick a course tonight, study when the roster allows,
            and walk away with credentials your clients can check.
          </p>
          <Link
            href="/pathways"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
          >
            Browse structured pathways
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ol className="relative mt-16 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-6">
          <div
            className="absolute top-2 bottom-2 left-5 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent lg:hidden"
            aria-hidden
          />
          <div
            className="absolute top-5 right-5 left-5 hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent lg:block"
            aria-hidden
          />

          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.li
                key={item.title}
                className="relative flex gap-5 lg:flex-1 lg:flex-col lg:items-center lg:gap-4 lg:text-center"
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ ...spring, delay: index * 0.08 }}
              >
                <span
                  className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#146fc2]/70 bg-white font-[family-name:var(--font-display)] text-sm font-semibold text-[#146fc2]"
                  aria-hidden
                >
                  {item.step}
                </span>
                <div>
                  <div className="flex items-center gap-2 lg:flex-col lg:gap-2">
                    <Icon className="h-4 w-4 text-[#146fc2]" aria-hidden />
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                      <span className="sr-only">Step {item.step}. </span>
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.text}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>

        <div className="mt-16 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
          <p className="mb-6 text-center text-sm text-slate-500">
            From enrolment to credential. Six steps to recognised professional development.
          </p>
          <StudentJourneyMap />
        </div>
      </div>
    </section>
  );
}
