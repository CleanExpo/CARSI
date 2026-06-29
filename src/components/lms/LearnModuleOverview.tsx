'use client';

import { BookOpen, Check, ChevronRight, Layers } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { dash } from '@/lib/dashboard-light-ui';

export interface LearnModuleOverviewLesson {
  id: string;
  title: string;
  order_index: number;
  completed: boolean;
}

export interface LearnModuleOverviewModule {
  id: string;
  title: string;
  order_index: number;
  lessons: LearnModuleOverviewLesson[];
}

type Props = {
  courseTitle: string;
  module: LearnModuleOverviewModule;
  moduleNumber: number;
  totalModules: number;
  onSelectLesson: (lessonId: string) => void;
};

export function LearnModuleOverview({
  courseTitle,
  module,
  moduleNumber,
  totalModules,
  onSelectLesson,
}: Props) {
  const total = module.lessons.length;
  const done = module.lessons.filter((l) => l.completed).length;
  const firstIncomplete = module.lessons.find((l) => !l.completed);
  const ctaTarget = firstIncomplete ?? module.lessons[0];

  return (
    <div className="space-y-8">
      <nav
        className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500"
        aria-label="Breadcrumb"
      >
        <span className="truncate">{courseTitle}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        <span className="font-medium text-slate-700">
          Module {moduleNumber} of {totalModules}
        </span>
      </nav>

      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#2490ed]/10 via-white to-slate-50 p-8 shadow-sm sm:p-10">
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#2490ed]/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#2490ed]/25 bg-[#eef7ff] px-3 py-1 text-[11px] font-semibold tracking-wider text-[#146fc2] uppercase">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Module overview
          </div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {module.title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
            This section is your landing page for the module: review what you will cover, then open
            lessons in order. Each module has at least this overview screen plus your lesson
            content—so navigation always feels structured and readable.
          </p>
          <div className="flex flex-wrap gap-4 pt-2 text-sm">
            <div className={`${dash.cardInset} px-4 py-2.5`}>
              <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Lessons
              </p>
              <p className="mt-0.5 font-mono text-lg text-slate-900">{total}</p>
            </div>
            <div className={`${dash.cardInset} px-4 py-2.5`}>
              <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Completed in module
              </p>
              <p className="mt-0.5 font-mono text-lg text-emerald-700">
                {done} / {total}
              </p>
            </div>
          </div>
          {ctaTarget ? (
            <div className="pt-2">
              <Button
                type="button"
                className="rounded-md bg-[#146fc2] px-5 text-white hover:bg-[#0f5fa8]"
                onClick={() => onSelectLesson(ctaTarget.id)}
              >
                {firstIncomplete ? 'Continue to next lesson' : 'Review first lesson'}
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <section className={`${dash.panel} p-6 sm:p-8`}>
        <div className="flex items-center gap-2 text-slate-900">
          <BookOpen className="h-5 w-5 text-[#146fc2]" aria-hidden />
          <h2 className="text-lg font-semibold">Lessons in this module</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Select a lesson to open it in the reader. Your progress is saved as you complete each one.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {module.lessons.map((les, i) => (
            <li key={les.id}>
              <button
                type="button"
                onClick={() => onSelectLesson(les.id)}
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#2490ed]/35 hover:bg-white"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white font-mono text-xs text-slate-500 ring-1 ring-slate-200">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-snug text-slate-900">{les.title}</span>
                    {les.completed ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Completed" />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">Lesson {i + 1}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
