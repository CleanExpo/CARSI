'use client';

import { Bold, Heading2, Italic, List, Quote, StickyNote, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { RefObject } from 'react';

import { Button } from '@/components/ui/button';
import type { NoteFormatAction } from '@/lib/lms/note-formatting';

const TOOLS: Array<{ action: NoteFormatAction; label: string; Icon: typeof Bold }> = [
  { action: 'heading', label: 'Heading', Icon: Heading2 },
  { action: 'quote', label: 'Quote', Icon: Quote },
  { action: 'bullet', label: 'List', Icon: List },
  { action: 'bold', label: 'Bold', Icon: Bold },
  { action: 'italic', label: 'Italic', Icon: Italic },
];

export function LearnerLessonNotes({
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
}: {
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
}) {
  const busy = savingNote || deletingNote || loadingNote;
  const empty = !noteText.trim();

  return (
    <section
      className="learner-home-surface learner-home-card mt-6 overflow-hidden rounded-[1.25rem]"
      aria-labelledby="lesson-notes-heading"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3.5">
        <span className="learner-home-inset inline-flex h-8 w-8 items-center justify-center rounded-lg text-sky-200">
          <StickyNote className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 id="lesson-notes-heading" className="text-sm font-semibold text-white">
            Lesson notes
          </h3>
          <p className="text-xs text-slate-300/80">Private to you. Saved against this lesson.</p>
        </div>
        {loadingNote ? (
          <span className="ml-auto text-xs text-slate-400">Loading…</span>
        ) : (
          <Link
            href="/dashboard/student/notes"
            className="ml-auto shrink-0 text-xs font-medium text-sky-200 hover:text-white"
          >
            All notes
          </Link>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div
          className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
          role="group"
          aria-label="Note editor"
        >
          <div className="flex flex-wrap gap-1 border-b border-white/10 bg-white/5 px-2 py-1.5">
            {TOOLS.map(({ action, label, Icon }) => (
              <button
                key={action}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => onFormat(action)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <textarea
            ref={noteEditorRef}
            value={noteText}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={6}
            placeholder="Jot a reminder, a hazard, or a question for the job site…"
            className="w-full resize-y border-0 bg-transparent px-4 py-3 text-[15px] leading-relaxed text-white placeholder:text-slate-500 focus:ring-0 focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onSaveNote}
            disabled={busy}
            className="h-9 rounded-full bg-white px-4 text-sm text-slate-950 hover:bg-sky-50 disabled:opacity-50"
          >
            {savingNote ? 'Saving…' : 'Save note'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDeleteNote}
            disabled={busy || empty}
            className="h-9 gap-1.5 border-white/15 bg-transparent px-3 text-sm text-sky-100 hover:border-red-300/40 hover:text-red-200"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {deletingNote ? 'Deleting…' : 'Delete'}
          </Button>
          {noteStatus ? (
            <p className="text-xs text-slate-300" role="status">
              {noteStatus}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
