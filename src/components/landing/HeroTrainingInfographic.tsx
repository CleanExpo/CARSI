'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Award, BadgeCheck, BookOpen, GraduationCap } from 'lucide-react';

type ModuleItem = { title: string; done: boolean; active?: boolean };

const modules: ModuleItem[] = [
  { title: 'Moisture mapping basics', done: true },
  { title: 'Extraction and drying science', done: true },
  { title: 'Documentation for insurers', done: false, active: true },
];

/**
 * Wide browser-style product mock for the hero panorama. Workspace chrome,
 * course progress card, pathway ring, and a credentials row, all inside one
 * light frame so nothing floats outside the panorama.
 */
export function HeroTrainingInfographic() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative w-full select-none bg-white p-4 sm:p-6 lg:p-8"
      role="img"
      aria-label="Learner workspace showing course progress, pathway completion, and an earned CARSI designation"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden />
        </div>
        <p className="text-[11px] font-medium tracking-[0.16em] text-slate-400 uppercase">
          CARSI workspace
        </p>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50 motion-safe:animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Active
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-[#f8fafc]">
          <div className="relative flex h-20 items-end justify-between bg-gradient-to-br from-[#146fc2] to-[#2490ed] px-4 py-3 sm:h-24">
            <span className="text-[10px] font-semibold tracking-wide text-white/90 uppercase">
              Water restoration
            </span>
            <BookOpen className="h-4 w-4 text-white/80" aria-hidden />
          </div>
          <div className="p-4">
            <p className="text-[10px] font-semibold tracking-wider text-[#146fc2] uppercase">
              In progress
            </p>
            <p className="mt-1 text-sm leading-snug font-semibold text-slate-900">
              Water Damage Restoration Essentials
            </p>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Course progress</span>
                <span className="font-semibold text-[#146fc2] tabular-nums">68%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                <motion.div
                  className="h-full rounded-full bg-[#146fc2]"
                  initial={{ width: reduceMotion ? '68%' : '0%' }}
                  animate={{ width: '68%' }}
                  transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                />
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {modules.map((mod) => (
                <li key={mod.title} className="flex items-start gap-2 text-[11px]">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      mod.done
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-[#e8f3fc] text-[#146fc2] ring-1 ring-[#2490ed]/25'
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
                        ? 'font-medium text-slate-900'
                        : 'text-slate-500 line-through decoration-slate-300'
                    }
                  >
                    {mod.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-[#f8fafc] p-5">
          <div className="relative h-[112px] w-[112px] sm:h-[120px] sm:w-[120px]">
            <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90" aria-hidden>
              <circle
                cx="54"
                cy="54"
                r="46"
                fill="none"
                className="stroke-slate-200"
                strokeWidth="7"
              />
              <motion.circle
                cx="54"
                cy="54"
                r="46"
                fill="none"
                stroke="#146fc2"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={289}
                initial={{ strokeDashoffset: reduceMotion ? 72 : 289 }}
                animate={{ strokeDashoffset: 72 }}
                transition={{
                  duration: reduceMotion ? 0 : 1.3,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.4,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <GraduationCap className="h-5 w-5 text-[#146fc2]" aria-hidden />
              <p className="mt-0.5 font-[family-name:var(--font-display)] text-xl font-semibold text-slate-900 tabular-nums">
                75%
              </p>
              <p className="text-[9px] font-medium tracking-wider text-slate-400 uppercase">
                Pathway
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
            CEC hours tracked automatically on completion
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#f8fafc] px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#146fc2]/10 text-[#146fc2]">
            <Award className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[9px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Designation earned
            </p>
            <p className="text-[12px] font-semibold text-slate-900">
              CARSI Water Restoration Practitioner
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          <BadgeCheck className="h-3 w-3" aria-hidden />
          CEC hours tracked
        </span>
      </div>
    </div>
  );
}
