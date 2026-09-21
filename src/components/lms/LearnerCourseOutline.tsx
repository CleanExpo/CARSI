'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

type OutlineLesson = { id: string; title: string; completed: boolean };
type OutlineModule = { id: string; title: string; lessons: OutlineLesson[] };

export function LearnerCourseOutline({
  modules,
  activeLessonId,
  onSelectLesson,
}: {
  modules: OutlineModule[];
  activeLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const list = (
    <nav aria-label="Course outline" className="space-y-4">
      {modules.map((mod) => (
        <div key={mod.id}>
          <p className="mb-1.5 text-xs font-semibold text-slate-500">{mod.title}</p>
          <ul className="space-y-0.5">
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
                    className={`flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm ${
                      active
                        ? 'bg-[#eef7ff] font-medium text-[#146fc2]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="mt-0.5 w-4 shrink-0 text-center" aria-hidden>
                      {les.completed ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : active ? (
                        '→'
                      ) : (
                        '○'
                      )}
                    </span>
                    <span className="min-w-0 leading-snug">{les.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Course outline
          <span aria-hidden>{open ? '−' : '+'}</span>
        </button>
        {open ? <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">{list}</div> : null}
      </div>
      <aside className="hidden w-full shrink-0 lg:block lg:w-[min(100%,280px)]">
        <div className="sticky top-6 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Course</p>
          {list}
        </div>
      </aside>
    </>
  );
}
