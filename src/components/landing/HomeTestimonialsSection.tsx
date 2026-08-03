'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Quote } from 'lucide-react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

const FEATURED = {
  quote:
    'CARSI lets me finish CEC hours between jobs instead of taking a day off site. The certificates hold up when a client or an insurer asks for proof.',
  role: 'Restoration technician',
  region: 'Queensland',
};

const SECONDARY = [
  {
    quote:
      'Onboarding new technicians is faster now. Everyone works through the same modules, and I can see progress without chasing anyone for paperwork.',
    role: 'Operations manager',
    region: 'New South Wales',
  },
  {
    quote:
      'Training used to eat a full day away from clients. Now the crew studies around the roster, and the work still gets done on time.',
    role: 'Business owner',
    region: 'Victoria',
  },
];

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Light editorial social proof. One large featured quote, two smaller quotes
 * stacked beside it. Content-object cards are acceptable here.
 */
export function HomeTestimonialsSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-testimonials-heading"
      className="relative border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="max-w-xl">
          <p className={LANDING_EYEBROW_CLASS}>What technicians say</p>
          <h2 id="home-testimonials-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Training that holds up on real jobs
          </h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
            Voices from the field, representative of the technicians, managers, and owners who
            study with CARSI.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <motion.figure
            className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-10"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={spring}
          >
            <Quote className="h-10 w-10 text-[#2490ed]/25" aria-hidden />
            <blockquote className="mt-6 font-[family-name:var(--font-display)] text-2xl font-medium leading-snug text-slate-900 sm:text-[1.7rem]">
              &ldquo;{FEATURED.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-8 text-sm">
              <span className="block font-semibold text-slate-900">{FEATURED.role}</span>
              <span className="text-slate-500">{FEATURED.region}</span>
            </figcaption>
          </motion.figure>

          <div className="flex flex-col gap-6">
            {SECONDARY.map((testimonial, i) => (
              <motion.figure
                key={testimonial.role}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ ...spring, delay: 0.1 + i * 0.08 }}
              >
                <Quote className="h-6 w-6 text-[#2490ed]/20" aria-hidden />
                <blockquote className="mt-4 text-[15px] leading-relaxed text-slate-700">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="block font-semibold text-slate-900">{testimonial.role}</span>
                  <span className="text-slate-500">{testimonial.region}</span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
