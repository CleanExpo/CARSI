'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Award, CheckCircle2, Shield } from 'lucide-react';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { IICRCDisciplineMap } from '@/components/lms/diagrams/IICRCDisciplineMap';

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

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Light credentials timeline — calm white plane, hairline rail, soft map panel.
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
      className="relative border-t border-slate-200/70 bg-white py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="max-w-xl">
          <p className="text-[11px] font-medium tracking-[0.22em] text-[#146fc2] uppercase">
            Credentials
          </p>
          <h2
            id="home-certifications-heading"
            className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-slate-950 md:text-4xl"
          >
            Credentials that hold up on the job site
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            A CARSI designation that also earns IICRC CECs across {disciplineCountLabel} IICRC
            disciplines — without confusing CARSI courses for IICRC certification delivery.
          </p>
        </div>

        <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)] lg:items-start lg:gap-20">
          <ol className="relative">
            {TIMELINE.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === TIMELINE.length - 1;
              return (
                <li key={item.title} className="relative flex gap-5 pb-10 last:pb-0">
                  {!isLast ? (
                    <span
                      className="absolute top-10 left-[17px] h-[calc(100%-2.25rem)] w-px bg-slate-200"
                      aria-hidden
                    />
                  ) : null}
                  <motion.span
                    className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#146fc2]"
                    initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ ...spring, delay: index * 0.08 }}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </motion.span>
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ ...spring, delay: index * 0.08 }}
                  >
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.body}</p>
                  </motion.div>
                </li>
              );
            })}
          </ol>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-3 sm:p-4">
            <IICRCDisciplineMap />
          </div>
        </div>
      </div>
    </section>
  );
}
