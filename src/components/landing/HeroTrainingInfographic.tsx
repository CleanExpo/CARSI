'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Flame,
  GraduationCap,
  Home,
  LayoutGrid,
  Play,
  Search,
  Settings,
} from 'lucide-react';

const CHART_LINE = [
  [0, 58],
  [30, 48],
  [60, 52],
  [90, 36],
  [120, 42],
  [150, 24],
  [180, 30],
  [210, 12],
  [240, 18],
] as const;

const linePoints = CHART_LINE.map(([x, y]) => `${x},${y}`).join(' ');
const areaPoints = `${linePoints} 240,72 0,72`;

const NAV_ICONS = [
  { icon: Home, active: true, label: 'Dashboard' },
  { icon: LayoutGrid, active: false, label: 'Catalogue' },
  { icon: BookOpen, active: false, label: 'My courses' },
  { icon: BarChart3, active: false, label: 'Progress' },
  { icon: Award, active: false, label: 'Credentials' },
] as const;

const STATS = [
  { icon: GraduationCap, value: '14.5', label: 'CEC hours' },
  { icon: BookOpen, value: '12', label: 'Courses done' },
  { icon: Flame, value: '6 wks', label: 'Study streak' },
] as const;

/**
 * Full learner-dashboard mock for the hero panorama. Browser chrome, icon
 * sidebar, stat tiles, an animated study chart, live course progress, and a
 * designation banner. Built to read as a real product screenshot.
 */
export function HeroTrainingInfographic() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative w-full select-none bg-white"
      role="img"
      aria-label="CARSI learner dashboard showing CEC hours, study activity, course progress, and an earned CARSI designation"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex min-w-0 items-center gap-2 rounded-full border border-slate-200/70 bg-[#f6f8fb] px-3.5 py-1 text-[11px] font-medium text-slate-400">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#2490ed]/80" aria-hidden />
          carsi.au/dashboard
        </div>
        <span className="hidden items-center gap-1.5 text-[10px] font-semibold text-emerald-600 sm:inline-flex">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50 motion-safe:animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="flex">
        {/* Icon sidebar */}
        <div className="hidden shrink-0 flex-col items-center gap-1.5 border-r border-slate-100 px-2.5 py-5 sm:flex">
          {NAV_ICONS.map(({ icon: Icon, active, label }) => (
            <span
              key={label}
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                active
                  ? 'bg-[#146fc2] text-white shadow-[0_8px_18px_-8px_rgba(20,111,194,0.7)]'
                  : 'text-slate-300'
              }`}
              aria-hidden
            >
              <Icon className="h-4 w-4" />
            </span>
          ))}
          <span
            className="mt-auto flex h-9 w-9 items-center justify-center rounded-xl pt-4 text-slate-300"
            aria-hidden
          >
            <Settings className="h-4 w-4" />
          </span>
        </div>

        {/* Main area */}
        <div className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                Monday, 7:12 pm
              </p>
              <p className="mt-0.5 font-[family-name:var(--font-display)] text-[15px] font-semibold text-slate-900 sm:text-base">
                Good evening, Sam
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <span
                className="hidden items-center gap-2 rounded-full border border-slate-200/70 bg-[#f6f8fb] px-3 py-1.5 text-[11px] text-slate-400 md:inline-flex"
                aria-hidden
              >
                <Search className="h-3 w-3" />
                Search courses
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#146fc2] to-[#2490ed] text-[11px] font-semibold text-white"
                aria-hidden
              >
                S
              </span>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
            {STATS.map(({ icon: Icon, value, label }, i) => (
              <motion.div
                key={label}
                className="rounded-xl border border-slate-100 bg-[#fafcfe] px-3 py-2.5 sm:px-4 sm:py-3"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.9 + i * 0.08 }}
              >
                <div className="flex items-center gap-1.5 text-[#146fc2]">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900 tabular-nums sm:text-lg">
                    {value}
                  </span>
                </div>
                <p className="mt-0.5 text-[9px] font-semibold tracking-[0.1em] text-slate-400 uppercase sm:text-[10px]">
                  {label}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-3 grid gap-2.5 sm:gap-3 lg:grid-cols-[1.25fr_1fr]">
            {/* Study activity chart */}
            <div className="rounded-xl border border-slate-100 bg-[#fafcfe] p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-700">Study activity</p>
                <span className="rounded-full bg-[#eef5fb] px-2 py-0.5 text-[9px] font-semibold text-[#146fc2]">
                  Last 9 weeks
                </span>
              </div>
              <div className="mt-3">
                <svg viewBox="0 0 240 72" className="h-20 w-full sm:h-24" aria-hidden>
                  <defs>
                    <linearGradient id="hero-chart-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2490ed" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#2490ed" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.polygon
                    points={areaPoints}
                    fill="url(#hero-chart-fill)"
                    initial={{ opacity: reduceMotion ? 1 : 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.6 }}
                  />
                  <motion.polyline
                    points={linePoints}
                    fill="none"
                    stroke="#146fc2"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: reduceMotion ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 1.1 }}
                  />
                  <motion.circle
                    cx="210"
                    cy="12"
                    r="4"
                    fill="#ffffff"
                    stroke="#146fc2"
                    strokeWidth="2.5"
                    initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 2.2 }}
                  />
                </svg>
              </div>
              <div className="mt-1 flex justify-between text-[8px] font-medium tracking-wide text-slate-300 uppercase">
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
              </div>
            </div>

            {/* Course in progress */}
            <div className="flex flex-col rounded-xl border border-slate-100 bg-[#fafcfe] p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-700">Continue learning</p>
                <span className="rounded-full bg-[#eef5fb] px-2 py-0.5 text-[9px] font-semibold text-[#146fc2]">
                  In progress
                </span>
              </div>
              <p className="mt-2.5 text-[12px] leading-snug font-semibold text-slate-900 sm:text-[13px]">
                Water Damage Restoration Essentials
              </p>
              <div className="mt-2.5">
                <div className="mb-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Module 5 of 7</span>
                  <span className="font-semibold text-[#146fc2] tabular-nums">68%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#146fc2] to-[#2490ed]"
                    initial={{ width: reduceMotion ? '68%' : '0%' }}
                    animate={{ width: '68%' }}
                    transition={{
                      duration: reduceMotion ? 0 : 1.2,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 1.3,
                    }}
                  />
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2.5 pt-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#146fc2] text-white shadow-[0_8px_18px_-8px_rgba(20,111,194,0.7)]"
                  aria-hidden
                >
                  <Play className="ml-0.5 h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-slate-900">
                    Documentation for insurers
                  </p>
                  <p className="text-[10px] text-slate-400">Next lesson, 12 min</p>
                </div>
              </div>
            </div>
          </div>

          {/* Designation banner */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-gradient-to-r from-[#f4f9fd] to-[#fafcfe] px-3.5 py-3 sm:px-4">
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
              Verified credential
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
