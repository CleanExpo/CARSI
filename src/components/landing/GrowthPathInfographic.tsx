'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, CalendarDays, MapPin, TrendingUp, Users } from 'lucide-react';

/**
 * Light growth-path visual — online learning flows into in-person scale.
 */
export function GrowthPathInfographic({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`relative mx-auto w-full max-w-[520px] select-none lg:max-w-none ${className}`}
      role="img"
      aria-label="Online IICRC CEC courses connect to in-person CCW Business Growth Days and workshop"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.2)] sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[10px] font-medium tracking-[0.18em] text-slate-400 uppercase">
            Growth pathway
          </p>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#146fc2]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#146fc2] motion-safe:animate-pulse" />
            Live
          </span>
        </div>

        <div className="relative">
          <svg
            viewBox="0 0 400 40"
            className="pointer-events-none absolute inset-x-0 top-[2.75rem] h-10 w-full"
            aria-hidden
          >
            <path
              d="M 70 20 H 330"
              fill="none"
              stroke="#dbe7f3"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {!reduceMotion ? (
              <motion.circle
                r="3.5"
                fill="#146fc2"
                initial={{ cx: 70, cy: 20, opacity: 0 }}
                animate={{ cx: [70, 330], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : null}
          </svg>

          <div className="relative grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#f8fafc] p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#146fc2] shadow-sm">
                <BookOpen className="h-4 w-4" aria-hidden />
              </span>
              <p className="mt-3 text-[10px] font-semibold tracking-wide text-[#146fc2] uppercase">
                Online
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-sm font-semibold text-slate-900">
                Courses &amp; CECs
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                <li className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-[#146fc2]" aria-hidden />
                  Self-paced modules
                </li>
                <li className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-[#146fc2]" aria-hidden />
                  Dashboard tracking
                </li>
              </ul>
            </div>

            <div className="rounded-xl bg-[#fff8ef] p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#a85500] shadow-sm">
                <CalendarDays className="h-4 w-4" aria-hidden />
              </span>
              <p className="mt-3 text-[10px] font-semibold tracking-wide text-[#a85500] uppercase">
                In person
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-sm font-semibold text-slate-900">
                Growth Days
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                <li className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-[#a85500]" aria-hidden />
                  Melbourne · Sydney · Brisbane
                </li>
                <li className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-[#a85500]" aria-hidden />
                  CARSI × CCW events
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
