'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';

interface Stat {
  value: string;
  label: string;
}

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Slim proof strip. Typographic metrics with a hairline top and bottom, no
 * cards. Sits directly under the hero and carries the trust signal.
 */
export function HomeTrustStrip({ stats }: { stats: Stat[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-label="CARSI at a glance" className="relative border-y border-slate-200/70 bg-white">
      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-8 md:py-10`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4 sm:gap-x-0">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="sm:border-l sm:border-slate-200/70 sm:pl-10 sm:first:border-l-0 sm:first:pl-0"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ ...spring, delay: i * 0.06 }}
              >
                <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-slate-950 tabular-nums md:text-[1.85rem]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>

          <p className="shrink-0 text-sm font-medium text-slate-500 lg:max-w-[220px] lg:text-right">
            Trusted by cleaning and restoration teams across Australia
          </p>
        </div>
      </div>
    </section>
  );
}
