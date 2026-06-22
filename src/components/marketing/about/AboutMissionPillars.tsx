'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HeartHandshake, LineChart, Users } from 'lucide-react';

const pillars = [
  {
    icon: LineChart,
    title: 'Growth',
    body: 'Structured pathways from first course to certified competency.',
    accent: '#2490ed',
  },
  {
    icon: HeartHandshake,
    title: 'Support',
    body: '24/7 access that fits around on-call schedules and site work.',
    accent: '#26c4a0',
  },
  {
    icon: Users,
    title: 'Development',
    body: 'Practitioner-led content aligned with IICRC continuing education.',
    accent: '#ed9d24',
  },
];

export function AboutMissionPillars() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute top-1/2 right-0 left-0 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#2490ed]/25 to-transparent md:block"
        aria-hidden
      />
      <ol className="grid gap-4 md:grid-cols-3">
        {pillars.map((pillar, i) => {
          const Icon = pillar.icon;
          return (
            <motion.li
              key={pillar.title}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="relative rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_16px_48px_-32px_rgba(15,23,42,0.12)] dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-white/[0.07] dark:to-white/[0.02] dark:shadow-none"
            >
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{
                  borderColor: `${pillar.accent}33`,
                  background: `${pillar.accent}12`,
                  color: pillar.accent,
                }}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-white/40">
                Pillar {i + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/58">{pillar.body}</p>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
