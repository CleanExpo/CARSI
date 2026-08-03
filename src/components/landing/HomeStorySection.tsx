'use client';

import { motion, useReducedMotion } from 'framer-motion';

import {
  LANDING_EYEBROW_CLASS,
  LANDING_STATEMENT_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

const PRINCIPLES = [
  {
    title: 'Built around real work',
    body: 'Every course is written for the jobs Australian crews actually do, in Australian conditions, to Australian standards.',
  },
  {
    title: 'Proof, not participation',
    body: 'Assessments lead to certificates and CARSI designations that employers, clients, and insurers can check for themselves.',
  },
  {
    title: 'One place for a career',
    body: 'From a first job on the tools to advanced practice, structured pathways connect every stage of a restoration career.',
  },
] as const;

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Editorial narrative band. A single large statement with tonal emphasis and
 * three hairline-separated principles. No cards, no icons, pure typography.
 */
export function HomeStorySection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-story-heading"
      className="relative border-t border-slate-200/70 bg-white py-20 md:py-28"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={spring}
        >
          <p className={LANDING_EYEBROW_CLASS}>Why CARSI exists</p>
          <h2 id="home-story-heading" className="sr-only">
            Why CARSI exists
          </h2>
          <p className={`mt-8 max-w-4xl text-slate-400 ${LANDING_STATEMENT_CLASS}`}>
            Most training asks a technician to{' '}
            <span className="font-medium text-slate-950">leave the tools</span>, travel to a
            classroom, and give up{' '}
            <span className="font-medium text-slate-950">a day of income</span>. CARSI was built
            so the industry can{' '}
            <span className="font-medium text-slate-950">
              keep working while it keeps learning
            </span>
            .
          </p>
        </motion.div>

        <div className="mt-16 grid gap-10 border-t border-slate-200/70 pt-10 md:grid-cols-3 md:gap-8">
          {PRINCIPLES.map((principle, i) => (
            <motion.div
              key={principle.title}
              className="md:border-l md:border-slate-200/70 md:pl-8 md:first:border-l-0 md:first:pl-0"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ ...spring, delay: i * 0.08 }}
            >
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.01em] text-slate-950">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{principle.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
