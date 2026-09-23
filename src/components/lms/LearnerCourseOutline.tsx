'use client';

import { Check, ChevronRight, Circle } from 'lucide-react';
import { useState } from 'react';

import { outlineLessonLabel } from '@/lib/learner-outline-label';
import { cn } from '@/lib/utils';

type OutlineLesson = { id: string; title: string; completed: boolean };
type OutlineModule = { id: string; title: string; lessons: OutlineLesson[] };

export function LearnerCourseOutline({
  modules,
  activeLessonId,
  onSelectLesson,
  onSelectModule,
}: {
  modules: OutlineModule[];
  activeLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onSelectModule?: (moduleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const doneLessons = modules.reduce((n, m) => n + m.lessons.filter((l) => l.completed).length, 0);

  const list = (
    <nav aria-label="Course outline" className="space-y-5">
      {modules.map((mod, mi) => {
        const modDone = mod.lessons.length > 0 && mod.lessons.every((l) => l.completed);
        const modActive = mod.lessons.some((l) => l.id === activeLessonId);
        return (
          <div key={mod.id}>
            {onSelectModule ? (
              <button
                type="button"
                onClick={() => onSelectModule(mod.id)}
                className="mb-2 flex w-full items-start gap-2 text-left"
              >
                <ModuleHeading index={mi} title={mod.title} done={modDone} active={modActive} />
              </button>
            ) : (
              <div className="mb-2">
                <ModuleHeading index={mi} title={mod.title} done={modDone} active={modActive} />
              </div>
            )}
            <ul className="ml-2 space-y-0.5 border-l-2 border-white/10 pl-3">
              {mod.lessons.map((les) => {
                const active = les.id === activeLessonId;
                return (
                  <li key={les.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLesson(les.id);
                        setOpen(false);
                      }}
                      aria-current={active ? 'location' : undefined}
                      className={cn(
                        'flex min-h-10 w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm leading-snug transition-colors',
                        active
                          ? 'bg-sky-400/15 font-medium text-sky-100 ring-1 ring-sky-300/25'
                          : 'text-slate-200 hover:bg-white/5'
                      )}
                    >
                      <span className="mt-0.5 shrink-0" aria-hidden>
                        {les.completed ? (
                          <Check className="h-4 w-4 text-emerald-300" />
                        ) : active ? (
                          <ChevronRight className="h-4 w-4 text-sky-200" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-500" />
                        )}
                      </span>
                      <span className="min-w-0 text-pretty">
                        {outlineLessonLabel(les.title, mod.title)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          className="learner-home-surface flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-white"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span>Course outline</span>
          <span className="text-xs font-normal text-slate-300 tabular-nums">
            {doneLessons}/{totalLessons}
          </span>
        </button>
        {open ? (
          <div className="learner-home-surface mt-3 rounded-xl p-4">
            {list}
          </div>
        ) : null}
      </div>
      <div className="hidden lg:block">
        <div className="learner-home-surface sticky top-6 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[1.25rem] p-4">
          <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-white/10 pb-3">
            <p className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-200 bg-clip-text text-[11px] font-semibold tracking-[0.16em] text-transparent uppercase">
              Course outline
            </p>
            <p className="text-xs text-slate-300 tabular-nums">
              {doneLessons} of {totalLessons}
            </p>
          </div>
          {list}
        </div>
      </div>
    </>
  );
}

function ModuleHeading({
  index,
  title,
  done,
  active,
}: {
  index: number;
  title: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <p className="flex items-start gap-2 text-[11px] font-semibold tracking-wide text-slate-400">
      <span
        className={cn(
          'mt-px font-mono text-[10px] tracking-normal',
          done ? 'text-emerald-300' : active ? 'text-sky-200' : 'text-slate-500'
        )}
      >
        M{index + 1}
      </span>
      <span
        className={cn(
          'min-w-0 text-xs font-semibold tracking-normal text-pretty normal-case',
          done ? 'text-slate-400' : 'text-white'
        )}
      >
        {title}
      </span>
    </p>
  );
}
