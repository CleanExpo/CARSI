'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Share2, StickyNote } from 'lucide-react';
import type { RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { dash } from '@/lib/dashboard-light-ui';
import type { NoteFormatAction } from '@/lib/lms/note-formatting';
import { cn } from '@/lib/utils';

type Props = {
  noteText: string;
  onNoteChange: (value: string) => void;
  noteEditorRef: RefObject<HTMLTextAreaElement | null>;
  onFormat: (action: NoteFormatAction) => void;
  onSaveNote: () => void;
  onDeleteNote: () => void;
  loadingNote: boolean;
  savingNote: boolean;
  deletingNote: boolean;
  noteStatus: string | null;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onShare?: () => void;
  showShare: boolean;
  onComplete: () => void;
  savingComplete: boolean;
  completed: boolean;
};

export function EnterpriseLessonFooter({
  noteText,
  onNoteChange,
  noteEditorRef,
  onFormat,
  onSaveNote,
  onDeleteNote,
  loadingNote,
  savingNote,
  deletingNote,
  noteStatus,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  onShare,
  showShare,
  onComplete,
  savingComplete,
  completed,
}: Props) {
  return (
    <div className="mt-10 space-y-6">
      <div className={`${dash.panel} overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3">
          <StickyNote className="h-4 w-4 text-[#146fc2]" aria-hidden />
          <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Field notes
          </span>
          {loadingNote ? <span className="ml-auto text-xs text-slate-400">Loading…</span> : null}
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(
              [
                ['heading', 'H'],
                ['quote', 'Quote'],
                ['bullet', 'List'],
                ['bold', 'Bold'],
                ['italic', 'Italic'],
              ] as Array<[NoteFormatAction, string]>
            ).map(([action, label]) => (
              <button
                key={action}
                type="button"
                onClick={() => onFormat(action)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            ref={noteEditorRef}
            value={noteText}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={4}
            placeholder="Capture site-specific reminders, hazards, or supervisor notes…"
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2490ed]/45 focus:outline-none focus:ring-2 focus:ring-[#2490ed]/15"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onSaveNote}
              disabled={savingNote || deletingNote || loadingNote}
              className="bg-[#2490ed] hover:bg-[#1a7fd4]"
            >
              {savingNote ? 'Saving…' : 'Save note'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onDeleteNote}
              disabled={savingNote || deletingNote || loadingNote || !noteText.trim()}
            >
              {deletingNote ? 'Deleting…' : 'Clear'}
            </Button>
            <Link
              href="/dashboard/student/notes"
              className="ml-auto text-xs font-medium text-[#146fc2] hover:underline"
            >
              All notes
            </Link>
          </div>
          {noteStatus ? <p className="mt-2 text-xs text-slate-500">{noteStatus}</p> : null}
        </div>
      </div>

      <div
        className={cn(
          dash.panel,
          'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6',
          completed && 'border-emerald-200 bg-emerald-50/30'
        )}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!hasPrevious}
            onClick={onPrevious}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!hasNext}
            onClick={onNext}
            className="gap-1.5"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {showShare && onShare ? (
            <Button
              type="button"
              variant="outline"
              onClick={onShare}
              className="gap-1.5 border-[#2490ed]/35 bg-[#eef7ff] text-[#146fc2] hover:bg-[#eef7ff]"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={savingComplete || completed}
            onClick={onComplete}
            className={cn(
              'min-w-[10rem] gap-2 shadow-sm',
              completed
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            )}
          >
            {completed ? (
              <>
                <span aria-hidden>✓</span> Lesson complete
              </>
            ) : savingComplete ? (
              'Saving…'
            ) : (
              'Mark lesson complete'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
