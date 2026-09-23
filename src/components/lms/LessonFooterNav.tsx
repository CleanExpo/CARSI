'use client';

import { Check, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

/**
 * The row: left-aligned on every width; pb-24 (6rem) clears the 66px launcher plus its margin
 * while the chat is closed. `lesson-footer-nav` is the hook for the open-panel rule in
 * app/globals.css: while FloatingChat holds `data-margot-open` on <html>, the row gets enough
 * bottom clearance (40rem) to scroll above the 560px panel and its launcher at every width.
 */
export const LESSON_FOOTER_ROW_CLASS =
  'lesson-footer-nav mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 pb-24 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-6';

/** The completion actions: left-aligned, beside Previous / Next. */
export const LESSON_FOOTER_ACTIONS_CLASS =
  'flex flex-wrap items-center justify-start gap-2 sm:gap-3';

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
        className={cn(
          'sticky bottom-6 z-20 inline-flex max-w-full flex-wrap items-center justify-start gap-2 rounded-2xl border px-2 py-2 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.28)] backdrop-blur-md',
          completed ? 'border-emerald-200 bg-emerald-50/90' : 'border-slate-200/90 bg-white/95'
        )}
      >
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            disabled={!hasPrev}
            className="h-11 gap-1 rounded-xl border-slate-200 bg-white px-3.5 text-slate-700 shadow-sm"
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!hasNext}
            className="h-11 gap-1 rounded-xl border-slate-200 bg-white px-3.5 text-slate-700 shadow-sm"
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
              className="h-11 gap-1.5 rounded-xl border-[#2490ed]/35 bg-[#eef7ff] px-3.5 text-[#146fc2] hover:bg-[#dceeff]"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share progress
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={saving || completed}
            className={cn(
              'h-11 gap-1.5 rounded-xl px-5 text-[15px] font-semibold shadow-md disabled:opacity-50',
              completed
                ? 'bg-emerald-100 text-emerald-800 shadow-none hover:bg-emerald-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
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
      {error ? (
        <p role="alert" className="w-full text-left text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
