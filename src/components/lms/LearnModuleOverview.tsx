'use client';

import { BookOpen, Check, ChevronRight, Layers } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
        className="flex flex-wrap items-center gap-1.5 text-xs text-white/45"
        aria-label="Breadcrumb"
      >
        <span className="truncate">{courseTitle}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        <span className="font-medium text-white/70">
          Module {moduleNumber} of {totalModules}
        </span>
      </nav>

      <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#2490ed]/18 via-white/[0.04] to-transparent p-8 shadow-[0_24px_80px_-32px_rgba(36,144,237,0.35)] sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#2490ed]/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wider text-[#7ec5ff] uppercase">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Module overview
          </div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {module.title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/65">
            This section is your landing page for the module: review what you will cover, then open
            lessons in order. Each module has at least this overview screen plus your lesson
            content—so navigation always feels structured and readable.
          </p>
          <div className="flex flex-wrap gap-4 pt-2 text-sm">
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-2.5">
              <p className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">
                Lessons
              </p>
              <p className="mt-0.5 font-mono text-lg text-white">{total}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-2.5">
              <p className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">
                Completed in module
              </p>
              <p className="mt-0.5 font-mono text-lg text-emerald-300/90">
                {done} / {total}
              </p>
            </div>
          </div>
          {ctaTarget ? (
            <div className="pt-2">
              <Button
                type="button"
                className="rounded-md bg-[#2490ed] px-5 text-white hover:bg-[#1a7fd4]"
                onClick={() => onSelectLesson(ctaTarget.id)}
              >
                {firstIncomplete ? 'Continue to next lesson' : 'Review first lesson'}
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <section className="rounded-xl border border-white/8 bg-white/[0.02] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-white">
          <BookOpen className="h-5 w-5 text-[#7ec5ff]" aria-hidden />
          <h2 className="text-lg font-semibold">Lessons in this module</h2>
        </div>
        <p className="mt-2 text-sm text-white/55">
          Select a lesson to open it in the reader. Your progress is saved as you complete each one.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {module.lessons.map((les, i) => (
            <li key={les.id}>
              <button
                type="button"
                onClick={() => onSelectLesson(les.id)}
                className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-[#2490ed]/35 hover:bg-white/[0.04]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 font-mono text-xs text-white/50">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-snug text-white/95">{les.title}</span>
                    {les.completed ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Completed" />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-white/40">Lesson {i + 1}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/25" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
