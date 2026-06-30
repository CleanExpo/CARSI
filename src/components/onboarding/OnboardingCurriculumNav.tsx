'use client';

import { Check, Home, Layers } from 'lucide-react';
import Link from 'next/link';

import {
  FLOOR_CARE_PHASES,
  getPhaseForModuleIndex,
  type OnboardingPhase,
} from '@/lib/onboarding/enterprise';
import { cn } from '@/lib/utils';

type Lesson = {
  id: string;
  title: string;
  completed: boolean;
  content_type?: string;
};

type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

type Props = {
  courseSlug: string;
  courseTitle: string;
  modules: Module[];
  activeLessonId: string | null;
  activeModuleId: string | null;
  view: 'lesson' | 'module';
  phases?: OnboardingPhase[];
  onSelectLesson: (id: string) => void;
  onSelectModule: (id: string) => void;
};

export function OnboardingCurriculumNav({
  courseSlug,
  courseTitle,
  modules,
  activeLessonId,
  activeModuleId,
  view,
  phases = FLOOR_CARE_PHASES,
  onSelectLesson,
  onSelectModule,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
      <div className="mb-5 space-y-2 border-b border-slate-200 pb-4">
        <Link
          href={`/dashboard/onboarding/${courseSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#146fc2] uppercase hover:underline"
        >
          <Home className="h-3.5 w-3.5" aria-hidden />
          Program hub
        </Link>
        <h2 className="text-balance text-sm font-semibold leading-snug text-slate-900">
          {courseTitle.replace(/^CARSI Maintenance Company Onboarding — /, '')}
        </h2>
      </div>
      <nav
        className="max-h-[min(60vh,520px)] space-y-6 overflow-y-auto pr-1 lg:max-h-[calc(100vh-10rem)]"
        aria-label="Program curriculum"
      >
        {modules.map((mod, mi) => {
          const phase = getPhaseForModuleIndex(mi, phases);
          const modDone =
            mod.lessons.length > 0 && mod.lessons.every((l) => l.completed);
          const modStarted = mod.lessons.some((l) => l.completed);
          const moduleOverviewActive = view === 'module' && activeModuleId === mod.id;

          return (
            <div key={mod.id}>
              {phase && mi === phase.moduleIndexes[0] ? (
                <p className="mb-3 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                  {phase.title}
                </p>
              ) : null}
              <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                <span
                  className={cn(
                    'font-mono',
                    modDone ? 'text-emerald-600' : modStarted ? 'text-[#146fc2]' : 'text-slate-500'
                  )}
                >
                  M{mi + 1}
                </span>
                <span className="min-w-0 truncate normal-case tracking-normal text-slate-600">
                  {mod.title.replace(/^Module \d+:\s*/i, '')}
                </span>
              </p>
              <button
                type="button"
                onClick={() => onSelectModule(mod.id)}
                className={cn(
                  'mb-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                  moduleOverviewActive
                    ? 'bg-[#2490ed]/15 text-[#146fc2] ring-1 ring-[#2490ed]/30'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Layers className="h-3.5 w-3.5 shrink-0 text-[#146fc2]" aria-hidden />
                <span>Module overview</span>
              </button>
              <ul className="space-y-0.5 border-l-2 border-slate-100 pl-3">
                {mod.lessons.map((les) => {
                  const active = view === 'lesson' && les.id === activeLessonId;
                  return (
                    <li key={les.id}>
                      <button
                        type="button"
                        onClick={() => onSelectLesson(les.id)}
                        className={cn(
                          'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                          active
                            ? 'bg-[#2490ed]/15 font-medium text-[#146fc2]'
                            : 'text-slate-700 hover:bg-slate-100'
                        )}
                      >
                        <span className="mt-0.5 shrink-0">
                          {les.completed ? (
                            <Check className="h-4 w-4 text-emerald-500" aria-hidden />
                          ) : (
                            <span
                              className={cn(
                                'block h-4 w-4 rounded-full border',
                                active ? 'border-[#2490ed]' : 'border-slate-300'
                              )}
                            />
                          )}
                        </span>
                        <span className="min-w-0 leading-snug">{les.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
