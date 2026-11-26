'use client';

import { ChevronRight, Layers, ShieldAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { LessonResource } from '@/lib/lms/lesson-resources';
import { isFlashcardResource, isInteractiveLessonResource } from '@/lib/lms/lesson-resources';

type Props = {
  resources: LessonResource[];
  lessonTitle: string;
  className?: string;
};

/** Surfaces interactive and study affordances at the top of an enrolled lesson. */
export function ChapterEngagementBanner({ resources, lessonTitle, className = '' }: Props) {
  const interactive = resources.filter(isInteractiveLessonResource);
  const flashcards = resources.filter(isFlashcardResource);
  if (interactive.length === 0 && flashcards.length === 0) return null;

  return (
    <div
      className={cn(
        'mb-6 rounded-xl border border-sky-200/40 bg-gradient-to-r from-sky-50 to-white px-4 py-3 sm:px-5',
        className
      )}
      data-testid="chapter-engagement-banner"
      role="note"
    >
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
        <ShieldAlert className="h-4 w-4 text-sky-600" aria-hidden />
        Active learning in this chapter
      </p>
      <p className="mt-1 text-sm text-slate-600">
        <span className="font-medium text-slate-800">{lessonTitle}</span> includes practice beyond
        reading — complete each activity below before marking the lesson complete.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-sky-800">
        {interactive.map((r) => (
          <li
            key={r.experience.id}
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1"
          >
            <Layers className="h-3 w-3" aria-hidden />
            {r.label ?? 'Interactive scenario'}
          </li>
        ))}
        {flashcards.length > 0 ? (
          <li className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            Flashcard knowledge check
            <ChevronRight className="h-3 w-3" aria-hidden />
          </li>
        ) : null}
      </ul>
    </div>
  );
}