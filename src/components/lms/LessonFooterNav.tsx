'use client';

import { Check, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The lesson page's footer: Previous / Next on the left, completion on the right.
 * `lesson-footer-nav` still clears Margot's open panel (app/globals.css).
 */
export interface LessonFooterNavProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  completed: boolean;
  saving: boolean;
  onComplete: () => void;
  onShare: () => void;
  error: string | null;
}

export const LESSON_FOOTER_ROW_CLASS =
  'lesson-footer-nav mt-6 flex w-full min-w-0 flex-col gap-3 pb-8 sm:justify-start';

/** The completion actions: packed together; the parent pins them to the right. */
export const LESSON_FOOTER_ACTIONS_CLASS =
  'flex flex-wrap items-center justify-start gap-2 sm:gap-3';

const navBtn =
  'h-11 gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-none hover:border-sky-300 hover:bg-sky-50 hover:text-slate-950 disabled:opacity-40';

export function LessonFooterNav({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  completed,
  saving,
  onComplete,
  onShare,
  error,
}: LessonFooterNavProps) {
  return (
    <div className={LESSON_FOOTER_ROW_CLASS} data-testid="lesson-footer">
      <div
        data-testid="lesson-footer-dock"
        className="flex w-full min-w-0 items-center gap-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!hasPrev}
            className={navBtn}
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!hasNext}
            className={navBtn}
            onClick={onNext}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="ml-auto flex justify-end">
          <div className={LESSON_FOOTER_ACTIONS_CLASS} data-testid="lesson-footer-actions">
            {completed ? (
              <Button
                type="button"
                variant="outline"
                onClick={onShare}
                className="h-11 gap-1.5 rounded-full border-[#146fc2] bg-white px-4 text-sm font-medium text-[#146fc2] shadow-none hover:bg-[#eef7ff]"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                Share progress
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={saving || completed}
              className={cn(
                'h-11 gap-1.5 rounded-full px-6 text-sm font-semibold shadow-none disabled:opacity-50',
                completed
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-[#146fc2] text-white hover:bg-[#0f5fa8]'
              )}
              onClick={onComplete}
            >
              {completed
                ? 'Lesson completed'
                : hasNext
                  ? 'Mark complete & continue'
                  : 'Mark lesson complete'}
              <Check className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
      {error ? (
        <p role="alert" className="w-full text-left text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
