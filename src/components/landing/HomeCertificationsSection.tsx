'use client';

import { Award, CheckCircle2, Shield } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { IICRCDisciplineMap } from '@/components/lms/diagrams/IICRCDisciplineMap';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';

const TIMELINE = [
  {
    icon: Shield,
    title: 'IICRC CEC provider',
    body: 'CARSI is an IICRC CEC Accredited provider. Completing eligible courses earns Continuing Education Credits toward maintaining your existing IICRC certification.',
  },
  {
    icon: Award,
    title: 'CARSI designations',
    body: 'Earn CARSI Southern Hemisphere Restoration Designations — credentials issued by CARSI for the work you complete on our platform.',
  },
  {
    icon: CheckCircle2,
    title: 'Verified on completion',
    body: 'Certificates and CEC records are issued when you pass — tracked in your learner dashboard for audits and recertification.',
  },
] as const;

/**
 * Certifications as a vertical timeline + discipline map — not a flat two-column stack.
 */
export function HomeCertificationsSection({
  disciplineCountLabel = 7,
}: {
  disciplineCountLabel?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-certifications-heading"
      className="relative overflow-hidden border-t border-slate-200/80 bg-white py-16 md:py-24 dark:border-white/10 dark:bg-[#080c14]"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#2490ed]/40 to-transparent md:left-[max(1.5rem,calc((100%-72rem)/2+1.5rem))]"
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#8fd0ff]">
            Credentials
          </p>
          <h2
            id="home-certifications-heading"
            className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white"
          >
            Credentials that hold up on the job site
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/65">
            Dual value: a CARSI designation that also earns IICRC CECs across {disciplineCountLabel}{' '}
            IICRC disciplines — without confusing CARSI courses for IICRC certification delivery.
          </p>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)] lg:gap-16 lg:items-start">
          <ol className="relative space-y-0">
            {TIMELINE.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === TIMELINE.length - 1;
              return (
                <li key={item.title} className="relative flex gap-5 pb-10 last:pb-0">
                  {!isLast ? (
                    <span
                      className="absolute top-10 left-[1.15rem] h-[calc(100%-2.5rem)] w-px bg-gradient-to-b from-[#2490ed]/50 to-[#2490ed]/10 dark:from-[#2490ed]/40 dark:to-transparent"
                      aria-hidden
                    />
                  ) : null}
                  <motion.span
                    className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#146fc2] bg-white text-[#146fc2] shadow-sm dark:border-[#2490ed] dark:bg-[#0a101c] dark:text-[#8fd0ff]"
                    initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                    whileInView={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.35, delay: index * 0.08 }}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </motion.span>
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                  >
                    <h3 className="text-base font-bold text-slate-950 dark:text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/65">
                      {item.body}
                    </p>
                  </motion.div>
                </li>
              );
            })}
          </ol>

          <div className="relative lg:sticky lg:top-28">
            <div
              className="pointer-events-none absolute -inset-3 rounded-[1.35rem] bg-[radial-gradient(ellipse_at_50%_40%,rgba(36,144,237,0.14),transparent_65%)] blur-xl dark:opacity-80"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-gradient-to-br from-white via-[#f8fbff] to-white p-1 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.35)] dark:border-white/10 dark:from-[#0f172a] dark:via-[#0d1524] dark:to-[#0a101c]">
              <div className="rounded-[1.15rem] bg-white/90 p-3 sm:p-4 dark:bg-[#080c14]/90">
                <IICRCDisciplineMap />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
