'use client';

import {
  BookOpen,
  Check,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Play,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { dash } from '@/lib/dashboard-light-ui';
import {
  FLOOR_CARE_PHASES,
  getPhaseForModuleIndex,
  type OnboardingPhase,
} from '@/lib/onboarding/enterprise';
import { cn } from '@/lib/utils';

import { OnboardingProgressRing } from './OnboardingProgressRing';

export interface OnboardingModuleLesson {
  id: string;
  title: string;
  order_index: number;
  completed: boolean;
  content_type?: string;
}

export interface OnboardingModuleShape {
  id: string;
  title: string;
  order_index: number;
  lessons: OnboardingModuleLesson[];
}

type Props = {
  courseTitle: string;
  module: OnboardingModuleShape;
  moduleNumber: number;
  totalModules: number;
  phases?: OnboardingPhase[];
  onSelectLesson: (lessonId: string) => void;
};

function cleanModuleTitle(title: string): string {
  return title.replace(/^Module \d+:\s*/i, '');
}

export function OnboardingModuleOverview({
  courseTitle,
  module,
  moduleNumber,
  totalModules,
  phases = FLOOR_CARE_PHASES,
  onSelectLesson,
}: Props) {
  const phase = getPhaseForModuleIndex(moduleNumber - 1, phases);
  const total = module.lessons.length;
  const done = module.lessons.filter((l) => l.completed).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const firstIncomplete = module.lessons.find((l) => !l.completed);
  const ctaTarget = firstIncomplete ?? module.lessons[0];

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <span className="truncate">{courseTitle.replace(/^CARSI Maintenance Company Onboarding — /, '')}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        <span className="font-medium text-slate-700">
          Module {moduleNumber} of {totalModules}
        </span>
      </nav>

      <header className={`${dash.hero} relative overflow-hidden`}>
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(36,144,237,0.14),transparent_55%)]"
          aria-hidden
        />
        <div className="relative grid gap-8 p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
          <div className="space-y-4">
            {phase ? (
              <p className={dash.eyebrow}>Phase · {phase.title}</p>
            ) : (
              <p className={dash.eyebrow}>Training module</p>
            )}
            <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {cleanModuleTitle(module.title)}
            </h1>
            {phase ? (
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{phase.subtitle}</p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {total} lessons
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                {done} completed
              </span>
            </div>
            {ctaTarget ? (
              <Button
                type="button"
                className="mt-2 rounded-lg bg-[#2490ed] px-5 text-white hover:bg-[#1a7fd4]"
                onClick={() => onSelectLesson(ctaTarget.id)}
              >
                <Play className="mr-2 h-4 w-4" aria-hidden />
                {firstIncomplete ? 'Start next lesson' : 'Review lessons'}
              </Button>
            ) : null}
          </div>
          <OnboardingProgressRing
            percent={percent}
            size={112}
            label="Module"
            sublabel={`${done}/${total} lessons`}
          />
        </div>
      </header>

      <section className={dash.panel}>
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#146fc2]" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900">Lesson pathway</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Work through lessons in order. Knowledge checks unlock as you progress.
          </p>
        </div>
        <ol className="divide-y divide-slate-100">
          {module.lessons.map((les, i) => {
            const isQuiz = les.content_type === 'quiz';
            const state = les.completed ? 'complete' : 'upcoming';
            return (
              <li key={les.id}>
                <button
                  type="button"
                  onClick={() => onSelectLesson(les.id)}
                  className="group flex w-full items-start gap-4 px-6 py-5 text-left transition hover:bg-slate-50/80"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition',
                      state === 'complete' &&
                        'border-emerald-200 bg-emerald-50 text-emerald-700',
                      state !== 'complete' &&
                        'border-slate-200 bg-white text-slate-500 group-hover:border-[#2490ed]/30 group-hover:text-[#146fc2]'
                    )}
                  >
                    {state === 'complete' ? (
                      <Check className="h-5 w-5" aria-hidden />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 group-hover:text-[#146fc2]">
                        {les.title}
                      </span>
                      {isQuiz ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef7ff] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#146fc2] uppercase">
                          <ClipboardCheck className="h-3 w-3" aria-hidden />
                          Assessment
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Lesson {i + 1} of {total}
                      {state === 'complete' ? ' · Complete' : ''}
                    </span>
                  </span>
                  <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-slate-300 group-hover:text-[#146fc2]" aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {done < total ? (
        <div className={`${dash.cardInset} flex items-start gap-3 border-[#2490ed]/15 bg-[#eef7ff]/50 p-5 text-sm text-slate-700`}>
          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2]" aria-hidden />
          <p>
            Complete all lessons in this module, including any knowledge checks, before moving to the
            next phase of your operational readiness program.
          </p>
        </div>
      ) : null}
    </div>
  );
}
