'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Award, BadgeCheck, ShieldCheck } from 'lucide-react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

const ITEMS = [
  {
    n: '01',
    title: 'IICRC CEC provider',
    body: 'CARSI is an IICRC CEC Accredited provider. Where the IICRC has approved a course, its CEC hours are shown on the course and recorded in your learner dashboard when you pass.',
  },
  {
    n: '02',
    title: 'CARSI designations',
    body: 'Earn CARSI Southern Hemisphere Restoration Designations, credentials issued by CARSI for the work you complete on our platform.',
  },
  {
    n: '03',
    title: 'Verified on completion',
    body: 'Certificates are issued when you pass and tracked in your learner dashboard for audits and recertification. CEC records are added for courses the IICRC has approved for CECs.',
  },
] as const;

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

function CornerMark({ position }: { position: string }) {
  return <span className={`absolute h-3 w-3 border-[#146fc2]/30 ${position}`} aria-hidden />;
}

/**
 * Certificate exhibit. A life-like CARSI certificate is the centrepiece, with
 * the three credential facts presented as numbered annotations whose hairline
 * connectors point at the document, spec-sheet style.
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
      className="relative overflow-hidden border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      {/* Faint backdrop glow behind the certificate side */}
      <div
        className="pointer-events-none absolute top-1/2 right-[-10%] h-[36rem] w-[36rem] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.10),transparent_70%)] blur-2xl"
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="max-w-xl">
          <p className={LANDING_EYEBROW_CLASS}>Credentials</p>
          <h2 id="home-certifications-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Credentials that hold up on the job site
          </h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
            Earn a CARSI designation, with training that spans {disciplineCountLabel} IICRC
            disciplines. Every certificate is issued with a verification record.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-6">
          {/* Annotations with connectors */}
          <ol className="order-2 space-y-10 lg:order-1 lg:space-y-12">
            {ITEMS.map((item, index) => (
              <motion.li
                key={item.n}
                className="flex items-start gap-5"
                initial={reduceMotion ? false : { opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ ...spring, delay: index * 0.1 }}
              >
                <span
                  className="font-[family-name:var(--font-display)] text-[1.6rem] leading-none font-semibold text-[#2490ed]/35 tabular-nums select-none"
                  aria-hidden
                >
                  {item.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-4">
                    <h3 className="shrink-0 font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.01em] text-slate-950">
                      {item.title}
                    </h3>
                    {/* Connector hairline pointing at the certificate */}
                    <span className="relative hidden h-px flex-1 lg:block" aria-hidden>
                      <motion.span
                        className="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-slate-200 via-slate-300 to-[#2490ed]/50"
                        initial={reduceMotion ? false : { scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{
                          duration: 0.7,
                          ease: [0.22, 1, 0.36, 1],
                          delay: 0.3 + index * 0.12,
                        }}
                      />
                      <motion.span
                        className="absolute top-1/2 right-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#2490ed]"
                        initial={reduceMotion ? false : { opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ ...spring, delay: 0.9 + index * 0.12 }}
                      />
                    </span>
                  </div>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                    {item.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>

          {/* The certificate */}
          <motion.div
            className="relative order-1 mx-auto w-full max-w-[430px] lg:order-2"
            initial={reduceMotion ? false : { opacity: 0, y: 30, rotate: 1.5 }}
            whileInView={{ opacity: 1, y: 0, rotate: -1.5 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ ...spring, stiffness: 90 }}
          >
            <div
              className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(36,144,237,0.14),transparent_65%)] blur-2xl"
              aria-hidden
            />

            <div className="relative rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-[0_40px_80px_-40px_rgba(15,23,42,0.35)]">
              <div className="relative overflow-hidden rounded-xl border border-slate-200/70 px-7 py-8 sm:px-9 sm:py-10">
                {/* Corner marks */}
                <CornerMark position="top-3 left-3 border-t border-l" />
                <CornerMark position="top-3 right-3 border-t border-r" />
                <CornerMark position="bottom-3 left-3 border-b border-l" />
                <CornerMark position="bottom-3 right-3 border-b border-r" />

                {/* Watermark */}
                <Award
                  className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 text-slate-900/[0.025]"
                  aria-hidden
                />

                <div className="relative text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-[#146fc2] text-[10px] font-bold text-white"
                      aria-hidden
                    >
                      C
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.02em] text-slate-900">
                      CARSI
                    </span>
                  </div>
                  <p className="mt-4 text-[9px] font-semibold tracking-[0.32em] text-slate-400 uppercase">
                    Certificate of Designation
                  </p>

                  <p className="mt-6 text-[11px] text-slate-400">This certifies that</p>
                  <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.01em] text-slate-950">
                    Sam Taylor
                  </p>
                  <p className="mt-3 text-[11px] text-slate-400">has earned the designation of</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-[17px] font-semibold text-[#146fc2]">
                    CARSI Water Restoration Practitioner
                  </p>

                  <div
                    className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-slate-300 to-transparent"
                    aria-hidden
                  />

                  <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-slate-400">
                    <span>Issued 12 Aug 2026</span>
                    <span className="h-3 w-px bg-slate-200" aria-hidden />
                    <span className="tabular-nums">ID CRD-2481</span>
                    <span className="h-3 w-px bg-slate-200" aria-hidden />
                    <span className="font-semibold text-[#146fc2]">Designation recorded</span>
                  </div>

                  <div className="mt-7 flex items-end justify-between">
                    <div className="text-left">
                      <svg
                        viewBox="0 0 120 28"
                        className="h-6 w-24 text-slate-700"
                        fill="none"
                        aria-hidden
                      >
                        <motion.path
                          d="M6 20 C 18 6, 26 24, 36 14 S 54 8, 62 16 S 84 24, 96 10 S 110 14, 115 12"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          initial={{ pathLength: reduceMotion ? 1 : 0 }}
                          whileInView={{ pathLength: 1 }}
                          viewport={{ once: true, amount: 0.6 }}
                          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                        />
                      </svg>
                      <p className="mt-1 border-t border-slate-200 pt-1 text-[9px] tracking-[0.08em] text-slate-400 uppercase">
                        Director of Training
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" aria-hidden />
                      carsi.au/verify
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stamping seal */}
            <motion.div
              className="absolute -top-6 -right-5 sm:-right-7"
              initial={reduceMotion ? false : { opacity: 0, scale: 1.7, rotate: -18 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 8 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.75 }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#146fc2]/25 bg-white/90 shadow-[0_18px_36px_-16px_rgba(20,111,194,0.5)] backdrop-blur-sm sm:h-24 sm:w-24">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#146fc2] to-[#2490ed] text-white sm:h-[4.2rem] sm:w-[4.2rem]">
                  <BadgeCheck className="h-5 w-5" aria-hidden />
                  <span className="mt-0.5 text-[6.5px] font-semibold tracking-[0.14em] uppercase">
                    Verified
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
