'use client';

import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * The lesson page's footer: Previous / Next, then the completion actions (WS1 fix 5, GP-544).
 *
 * Measured live on 2026-09-03: Margot's launcher is fixed at the bottom-right corner (a 214 by
 * 66 pill on desktop, 121 by 66 on a phone) and covered the right-aligned "Mark lesson
 * complete" button at 1200, 820 and 390 widths before the chat was even opened; the open
 * 420 by 560 panel covers it too. So every control here stays at the LEFT of the content
 * column, never pushed to the right edge, and the row keeps bottom clearance for the launcher
 * when the page is scrolled to the end. Both are pinned by LessonFooterNav.test.tsx.
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

/** The row: left-aligned on every width; pb-24 (6rem) clears the 66px launcher plus its margin. */
export const LESSON_FOOTER_ROW_CLASS =
  'mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 pb-24 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-6';

/** The completion actions: left-aligned, beside Previous / Next. */
export const LESSON_FOOTER_ACTIONS_CLASS = 'flex flex-wrap items-center justify-start gap-2 sm:gap-3';

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
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!hasPrev}
          className="gap-1 border-slate-300 text-slate-700"
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasNext}
          className="gap-1 border-slate-300 text-slate-700"
          onClick={onNext}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className={LESSON_FOOTER_ACTIONS_CLASS} data-testid="lesson-footer-actions">
        {completed ? (
          <Button
            type="button"
            variant="outline"
            onClick={onShare}
            className="gap-1.5 border-[#2490ed]/35 bg-[#2490ed]/10 text-[#146fc2] hover:bg-[#2490ed]/20"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Share progress
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={saving || completed}
          className="rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          onClick={onComplete}
        >
          {completed ? 'Lesson completed' : 'Mark lesson complete'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="w-full text-left text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
