'use client';

import { CheckCircle2, Clock } from 'lucide-react';

import { dash } from '@/lib/dashboard-light-ui';

type Props = {
  title: string;
  moduleTitle?: string | null;
  lessonNumber?: number | null;
  totalLessons?: number | null;
  moduleLessonNumber?: number | null;
  moduleLessonTotal?: number | null;
  durationMinutes?: number | null;
  completed?: boolean;
  isPreview?: boolean;
  courseProgressPercent?: number | null;
};

export function EnterpriseLessonHeader({
  title,
  moduleTitle,
  lessonNumber,
  totalLessons,
  moduleLessonNumber,
  moduleLessonTotal,
  durationMinutes,
  completed,
  isPreview,
  courseProgressPercent,
}: Props) {
  const cleanModule = moduleTitle?.replace(/^Module \d+:\s*/i, '') ?? null;

  return (
    <header className="space-y-5">
      {courseProgressPercent != null ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Program progress</span>
            <span className="tabular-nums text-[#146fc2]">{courseProgressPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2490ed] to-[#146fc2] transition-all duration-500"
              style={{ width: `${courseProgressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-3 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className={dash.eyebrow}>Training lesson</p>
          {completed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-800 uppercase">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              Completed
            </span>
          ) : null}
          {isPreview ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
              Preview
            </span>
          ) : null}
        </div>

        <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem] sm:leading-tight lg:text-3xl">
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
          {cleanModule ? (
            <span className="font-medium text-[#146fc2]">{cleanModule}</span>
          ) : null}
          {lessonNumber != null && totalLessons != null ? (
            <span className="tabular-nums">
              Lesson {lessonNumber} of {totalLessons}
            </span>
          ) : null}
          {moduleLessonNumber != null && moduleLessonTotal != null ? (
            <span className="tabular-nums text-slate-400">
              · Module lesson {moduleLessonNumber}/{moduleLessonTotal}
            </span>
          ) : null}
          {durationMinutes ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {durationMinutes} min
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
