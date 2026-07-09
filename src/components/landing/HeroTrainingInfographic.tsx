'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  Award,
  BadgeCheck,
  BookOpen,
  Clock,
  GraduationCap,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

type ModuleItem = { title: string; done: boolean; active?: boolean };

const modules: ModuleItem[] = [
  { title: 'Moisture mapping basics', done: true },
  { title: 'Extraction & drying science', done: true },
  { title: 'Documentation for insurers', done: false, active: true },
];

/**
 * Premium hero visual — layered learner workspace mockup with floating proof cards.
 * Theme-aware; reads clearly in light and dark mode.
 */
export function HeroTrainingInfographic() {
  const reduceMotion = useReducedMotion();

  const floatEase: [number, number, number, number] = [0.4, 0, 0.2, 1];
  const float = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          y: [0, -6, 0],
          transition: { duration: 5 + delay, repeat: Infinity, ease: floatEase, delay },
        };

  return (
    <div
      className="relative mx-auto w-full max-w-[600px] select-none lg:max-w-none"
      role="img"
      aria-label="Learner workspace showing course progress, CEC tracking, and verifiable credentials"
    >
      {/* Ambient depth */}
      <div
        className="pointer-events-none absolute inset-x-0 -inset-y-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_30%_20%,rgba(36,144,237,0.22),transparent_55%),radial-gradient(ellipse_at_80%_70%,rgba(237,157,36,0.14),transparent_50%)] blur-2xl dark:opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-8 right-4 h-32 w-32 rounded-full bg-[#2490ed]/20 blur-3xl dark:bg-[#2490ed]/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-6 left-0 h-28 w-28 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/20"
        aria-hidden
      />

      {/* Floating CEC chip */}
      <motion.div
        animate={float(0.4)}
        className="absolute -top-2 right-2 z-20 flex items-center gap-2 rounded-xl border border-[#2490ed]/25 bg-white/95 px-3 py-2 shadow-[0_16px_40px_-16px_rgba(36,144,237,0.45)] backdrop-blur-md dark:border-[#2490ed]/35 dark:bg-[#0f172a]/95"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef7ff] dark:bg-[#2490ed]/15">
          <TrendingUp className="h-4 w-4 text-[#146fc2] dark:text-[#8fd0ff]" aria-hidden />
        </span>
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-slate-600 uppercase dark:text-white/55">
            CEC progress
          </p>
          <p className="text-sm font-bold text-slate-900 tabular-nums dark:text-white">
            14.5 <span className="text-xs font-medium text-slate-600 dark:text-white/50">/ 20 hrs</span>
          </p>
        </div>
      </motion.div>

      {/* Floating credential chip */}
      <motion.div
        animate={float(1.2)}
        className="absolute -bottom-3 -left-1 z-20 flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-white/95 px-3 py-2.5 shadow-[0_16px_40px_-16px_rgba(16,185,129,0.35)] backdrop-blur-md dark:border-emerald-500/30 dark:bg-[#0f172a]/95"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/15">
          <BadgeCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">Credential ready</p>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-300">Verifiable · shareable</p>
        </div>
      </motion.div>

      {/* Main panel */}
      <div className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-gradient-to-br from-white via-white to-[#f0f7ff] p-[1px] shadow-[0_32px_80px_-40px_rgba(15,23,42,0.35)] dark:border-white/10 dark:from-white/10 dark:via-white/[0.06] dark:to-[#2490ed]/10 dark:shadow-[0_32px_80px_-36px_rgba(0,0,0,0.65)]">
        <div className="rounded-[1.3rem] bg-white/90 p-4 backdrop-blur-sm sm:p-5 dark:bg-[#080c14]/90">
          {/* Window chrome */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden />
            </div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase dark:text-white/55">
              CARSI workspace
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Active
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_0.85fr] sm:gap-4">
            {/* Course card */}
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-[#f8fbff] to-white dark:border-white/10 dark:from-[#0f172a] dark:to-[#0a1018]">
              <div className="relative h-[88px] overflow-hidden bg-gradient-to-br from-[#146fc2] via-[#2490ed] to-[#0f5fa8] sm:h-[96px]">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                  aria-hidden
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.25),transparent_45%)]" aria-hidden />
                <div className="relative flex h-full items-end justify-between p-3">
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    CEC-accredited water restoration
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                    <BookOpen className="h-4 w-4 text-white" aria-hidden />
                  </span>
                </div>
              </div>

              <div className="p-3.5">
                <p className="text-[10px] font-semibold tracking-wider text-[#146fc2] uppercase dark:text-[#8fd0ff]">
                  In progress
                </p>
                {/* Decorative mockup label — intentionally not a heading element so it
                    stays out of the document outline (avoids an H1 → H3 skip; #304). */}
                <p className="mt-1 text-sm font-bold leading-snug text-slate-900 dark:text-white">
                  Water Damage Restoration — Essentials
                </p>

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-[10px]">
                    <span className="font-medium text-slate-600 dark:text-white/50">Course progress</span>
                    <span className="font-bold text-[#146fc2] tabular-nums dark:text-[#8fd0ff]">68%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#146fc2] to-[#2490ed]"
                      initial={{ width: reduceMotion ? '68%' : '0%' }}
                      animate={{ width: '68%' }}
                      transition={{ duration: reduceMotion ? 0 : 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                    />
                  </div>
                </div>

                <ul className="mt-3 space-y-2">
                  {modules.map((mod) => (
                    <li key={mod.title} className="flex items-start gap-2 text-[11px]">
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          mod.done
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : mod.active
                              ? 'bg-[#eef7ff] text-[#146fc2] ring-2 ring-[#2490ed]/30 dark:bg-[#2490ed]/15 dark:text-[#8fd0ff]'
                              : 'bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-white/30'
                        }`}
                      >
                        {mod.done ? (
                          <BadgeCheck className="h-2.5 w-2.5" aria-hidden />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                        )}
                      </span>
                      <span
                        className={
                          mod.active
                            ? 'font-medium text-slate-900 dark:text-white'
                            : mod.done
                              ? 'text-slate-600 line-through dark:text-white/55'
                              : 'text-slate-600 dark:text-white/55'
                        }
                      >
                        {mod.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right column — ring + quick stats */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-[#f8fbff]/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="relative h-[108px] w-[108px]">
                  <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90" aria-hidden>
                    <circle
                      cx="54"
                      cy="54"
                      r="46"
                      fill="none"
                      className="stroke-slate-200 dark:stroke-white/10"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="54"
                      cy="54"
                      r="46"
                      fill="none"
                      stroke="url(#hero-ring-gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={289}
                      initial={{ strokeDashoffset: reduceMotion ? 72 : 289 }}
                      animate={{ strokeDashoffset: 72 }}
                      transition={{ duration: reduceMotion ? 0 : 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.35 }}
                    />
                    <defs>
                      <linearGradient id="hero-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2490ed" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-[#146fc2] dark:text-[#8fd0ff]" aria-hidden />
                    <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums dark:text-white">75%</p>
                    <p className="text-[9px] font-medium tracking-wider text-slate-600 uppercase dark:text-white/55">
                      Pathway
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Clock, value: '24/7', label: 'Access', tone: 'text-[#146fc2] dark:text-[#8fd0ff]' },
                  { icon: Award, value: 'IICRC', label: 'CECs', tone: 'text-[#a85500] dark:text-[#ed9d24]' },
                ].map(({ icon: Icon, value, label, tone }) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2.5 text-center dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <Icon className={`mx-auto h-3.5 w-3.5 ${tone}`} aria-hidden />
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
                    <p className="text-[9px] font-medium tracking-wider text-slate-600 uppercase dark:text-white/55">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline strip */}
          <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-2">
              {[
                { step: 'Learn', sub: 'Self-paced', active: true, color: '#2490ed' },
                { step: 'Track', sub: 'CEC hours', active: true, color: '#ed9d24' },
                { step: 'Prove', sub: 'Credentials', active: false, color: '#10b981' },
              ].map((item, i, arr) => (
                <div key={item.step} className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                      style={{
                        backgroundColor: item.active ? item.color : `${item.color}55`,
                        boxShadow: item.active ? `0 0 0 3px ${item.color}22` : undefined,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="mt-1 truncate text-[10px] font-semibold text-slate-800 dark:text-white/90">
                      {item.step}
                    </span>
                    <span className="truncate text-[9px] text-slate-600 dark:text-white/55">{item.sub}</span>
                  </div>
                  {i < arr.length - 1 ? (
                    <div
                      className="h-px w-full max-w-[28px] shrink bg-gradient-to-r from-[#2490ed]/50 to-[#ed9d24]/50"
                      aria-hidden
                    />
                  ) : null}
                </div>
              ))}
              <Sparkles className="hidden h-4 w-4 shrink-0 text-[#a85500] dark:text-[#ed9d24] sm:block" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
