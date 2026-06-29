'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  CalendarDays,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

/**
 * Premium growth-path visual — online learning flows into in-person scale.
 * Theme-aware layered cards with subtle motion; pairs with HomeGrowthSection.
 */
export function GrowthPathInfographic({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  const float = (delay = 0) =>
    reduceMotion
      ? undefined
      : {
          y: [0, -5, 0],
          transition: {
            duration: 4.8 + delay,
            repeat: Infinity,
            ease: 'easeInOut' as const,
            delay,
          },
        };

  return (
    <div
      className={`relative mx-auto w-full min-h-[340px] max-w-[520px] select-none lg:max-w-none ${className}`}
      role="img"
      aria-label="Online IICRC courses connect to in-person CCW Business Growth Days and workshop"
    >
      {/* Ambient depth */}
      <div
        className="pointer-events-none absolute inset-x-0 -inset-y-5 rounded-[1.75rem] bg-[radial-gradient(ellipse_at_20%_15%,rgba(36,144,237,0.2),transparent_55%),radial-gradient(ellipse_at_85%_75%,rgba(237,157,36,0.14),transparent_50%)] blur-2xl dark:opacity-90"
        aria-hidden
      />

      {/* Floating venue chip */}
      <motion.div
        animate={float(0.5)}
        className="absolute -top-2 right-3 z-20 flex items-center gap-2 rounded-xl border border-[#ed9d24]/30 bg-white/95 px-2.5 py-2 shadow-[0_14px_36px_-16px_rgba(237,157,36,0.4)] backdrop-blur-md dark:border-[#ed9d24]/35 dark:bg-[#0f172a]/95"
      >
        <CalendarDays className="h-3.5 w-3.5 text-[#a85500] dark:text-[#ed9d24]" aria-hidden />
        <span className="text-[10px] font-semibold text-slate-800 dark:text-white/90">
          Melbourne · Sydney
        </span>
      </motion.div>

      {/* Main panel */}
      <div className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-gradient-to-br from-white via-[#f8fbff] to-[#fff8ed] p-[1px] shadow-[0_28px_70px_-40px_rgba(15,23,42,0.32)] dark:border-white/10 dark:from-white/10 dark:via-[#0d1524] dark:to-[#0a101c] dark:shadow-[0_28px_70px_-36px_rgba(0,0,0,0.6)]">
        <div className="rounded-[1.3rem] bg-white/92 p-4 backdrop-blur-sm sm:p-5 dark:bg-[#080c14]/92">
          {/* Chrome */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ff5f57]" aria-hidden />
              <span className="h-2 w-2 rounded-full bg-[#febc2e]" aria-hidden />
              <span className="h-2 w-2 rounded-full bg-[#28c840]" aria-hidden />
            </div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-600 uppercase dark:text-white/55">
              Growth pathway
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#2490ed]/25 bg-[#eef7ff] px-2 py-0.5 text-[9px] font-semibold text-[#146fc2] dark:border-[#2490ed]/30 dark:bg-[#2490ed]/10 dark:text-[#8fd0ff]">
              <Sparkles className="h-3 w-3" aria-hidden />
              Live
            </span>
          </div>

          {/* Flow SVG backdrop */}
          <div className="relative">
            <svg
              viewBox="0 0 400 120"
              className="pointer-events-none absolute inset-x-0 top-8 h-[88px] w-full opacity-90"
              aria-hidden
            >
              <defs>
                <linearGradient id="growth-flow-blue" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2490ed" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#2490ed" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="growth-flow-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ed9d24" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ed9d24" stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <path
                d="M 48 56 C 120 56, 140 56, 200 56"
                fill="none"
                stroke="url(#growth-flow-blue)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 200 56 C 260 56, 280 56, 352 56"
                fill="none"
                stroke="url(#growth-flow-gold)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {!reduceMotion ? (
                <>
                  <motion.circle
                    r="3"
                    fill="#2490ed"
                    initial={{ cx: 48, cy: 56 }}
                    animate={{ cx: [48, 200], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.circle
                    r="3"
                    fill="#ed9d24"
                    initial={{ cx: 200, cy: 56 }}
                    animate={{ cx: [200, 352], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
                  />
                </>
              ) : null}
            </svg>

            <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-3">
              {/* Online node */}
              <motion.div
                animate={float(0)}
                className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-[#f8fbff] to-white p-3 shadow-sm dark:border-white/10 dark:from-[#0f172a] dark:to-[#0a1018]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef7ff] dark:bg-[#2490ed]/15">
                  <BookOpen className="h-4 w-4 text-[#146fc2] dark:text-[#8fd0ff]" aria-hidden />
                </span>
                <p className="mt-2 text-[10px] font-semibold tracking-wide text-[#146fc2] uppercase dark:text-[#8fd0ff]">
                  Online
                </p>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Courses &amp; CECs</p>
                <div className="mt-2.5 space-y-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-[#2490ed]"
                      initial={{ width: reduceMotion ? '72%' : '0%' }}
                      animate={{ width: '72%' }}
                      transition={{ duration: reduceMotion ? 0 : 1, delay: 0.2 }}
                    />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-[#2490ed]/50"
                      initial={{ width: reduceMotion ? '48%' : '0%' }}
                      animate={{ width: '48%' }}
                      transition={{ duration: reduceMotion ? 0 : 1, delay: 0.35 }}
                    />
                  </div>
                </div>
                <p className="mt-2 text-[9px] text-emerald-600 dark:text-emerald-400">Pathways tracked</p>
              </motion.div>

              {/* Center hub */}
              <div className="flex flex-col items-center pt-6">
                <motion.div
                  animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#ed9d24]/40 bg-gradient-to-br from-[#fff8ed] to-white shadow-[0_0_0_8px_rgba(237,157,36,0.08)] dark:from-[#ed9d24]/15 dark:to-[#0f172a] dark:shadow-[0_0_0_10px_rgba(237,157,36,0.12)]"
                >
                  <span className="absolute inset-0 rounded-full border border-[#ed9d24]/20" aria-hidden />
                  <TrendingUp className="h-5 w-5 text-[#a85500] dark:text-[#ed9d24]" aria-hidden />
                </motion.div>
                <p className="mt-2 text-center text-[11px] font-bold text-slate-900 dark:text-white">Grow</p>
                <p className="text-center text-[9px] text-slate-600 dark:text-white/55">your business</p>
              </div>

              {/* In-person node */}
              <motion.div
                animate={float(0.8)}
                className="rounded-xl border border-[#ed9d24]/25 bg-gradient-to-br from-[#fff8ed] to-white p-3 shadow-sm dark:border-[#ed9d24]/20 dark:from-[#1a1408] dark:to-[#0a1018]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff1dc] dark:bg-[#ed9d24]/15">
                  <Users className="h-4 w-4 text-[#9a4a00] dark:text-[#f2b14f]" aria-hidden />
                </span>
                <p className="mt-2 text-[10px] font-semibold tracking-wide text-[#9a4a00] uppercase dark:text-[#f2b14f]">
                  In person
                </p>
                <p className="text-xs font-bold text-slate-900 dark:text-white">CCW Growth Days</p>
                <ul className="mt-2.5 space-y-1.5">
                  {[
                    { city: 'Melbourne', tone: 'bg-emerald-500' },
                    { city: 'Sydney', tone: 'bg-[#2490ed]' },
                  ].map(({ city, tone }) => (
                    <li
                      key={city}
                      className="flex items-center gap-2 rounded-md border border-slate-200/70 bg-white/80 px-2 py-1 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <MapPin className={`h-3 w-3 shrink-0 text-slate-500`} aria-hidden />
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} aria-hidden />
                      <span className="text-[9px] font-medium text-slate-700 dark:text-white/75">{city}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>

          {/* Workshop strip */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300/80 bg-[#f8fbff]/80 px-3 py-2.5 dark:border-white/12 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-white/[0.06]">
                <Sparkles className="h-3.5 w-3.5 text-[#146fc2] dark:text-[#8fd0ff]" aria-hidden />
              </span>
              <div>
                <p className="text-[10px] font-semibold text-slate-900 dark:text-white">2-Day CCW Workshop</p>
                <p className="text-[9px] text-slate-600 dark:text-white/55">Hands-on carpet cleaning</p>
              </div>
            </div>
            <p className="text-right text-[9px] font-semibold tracking-wide text-[#146fc2] uppercase dark:text-[#8fd0ff]">
              Online → live → scale
            </p>
          </div>

          {/* Timeline pills */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { step: '1', label: 'Learn', sub: 'Self-paced', color: '#2490ed' },
              { step: '2', label: 'Connect', sub: 'Growth Days', color: '#ed9d24' },
              { step: '3', label: 'Scale', sub: 'On site', color: '#10b981' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200/70 bg-white/80 px-2 py-2 text-center dark:border-white/10 dark:bg-white/[0.04]"
              >
                <span
                  className="mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.step}
                </span>
                <p className="mt-1 text-[10px] font-semibold text-slate-800 dark:text-white">{item.label}</p>
                <p className="text-[8px] text-slate-600 dark:text-white/55">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
