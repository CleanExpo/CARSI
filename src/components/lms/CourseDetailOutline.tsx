'use client';

import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';

type SyllabusLesson = { id: string; title: string };
type SyllabusModule = { id: string; title: string; lessons: SyllabusLesson[] };

type LiveLesson = { id: string; title: string; completed: boolean };
type LiveModule = { id: string; title: string; lessons: LiveLesson[] };

export function CourseDetailOutline({
  slug,
  syllabus,
}: {
  slug: string;
  syllabus: SyllabusModule[];
}) {
  const [modules, setModules] = useState<LiveModule[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<{ modules: LiveModule[] }>(`/api/lms/courses/${encodeURIComponent(slug)}/curriculum`)
      .then((data) => {
        if (!cancelled && Array.isArray(data.modules)) setModules(data.modules);
      })
      .catch(() => {
        if (!cancelled) setModules(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const rows = modules ?? syllabus;
  if (rows.length === 0) return null;

  let lessonNumber = 0;
  let foundCurrent = false;

  return (
    <section>
      <h2 className={dash.h2}>Course content</h2>
      <ol className="mt-4 space-y-4">
        {rows.map((mod) => (
          <li key={mod.id}>
            <p className="text-sm font-medium text-slate-900">{mod.title}</p>
            <ol className="mt-2 space-y-1.5">
              {mod.lessons.map((lesson) => {
                lessonNumber += 1;
                const live = 'completed' in lesson ? lesson : null;
                const completed = live?.completed === true;
                let mark: 'done' | 'current' | 'upcoming' = 'upcoming';
                if (completed) mark = 'done';
                else if (modules && !foundCurrent) {
                  mark = 'current';
                  foundCurrent = true;
                }
                return (
                  <li key={lesson.id} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-5 shrink-0 text-center tabular-nums text-slate-400" aria-hidden>
                      {mark === 'done' ? '✓' : mark === 'current' ? '→' : lessonNumber}
                    </span>
                    <span className={mark === 'current' ? 'font-medium text-slate-900' : undefined}>
                      {lesson.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}
