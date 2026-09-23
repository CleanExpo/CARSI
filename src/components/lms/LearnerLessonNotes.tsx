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
      className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"
      aria-labelledby="lesson-notes-heading"
    >
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-[#eef7ff] to-white px-5 py-3.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#146fc2] ring-1 ring-[#b8dbfb]">
          <StickyNote className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 id="lesson-notes-heading" className="text-sm font-semibold text-slate-900">
            Lesson notes
          </h3>
          <p className="text-xs text-slate-500">Private to you. Saved against this lesson.</p>
        </div>
        {loadingNote ? (
          <span className="ml-auto text-xs text-slate-400">Loading…</span>
        ) : (
          <Link
            href="/dashboard/student/notes"
            className="ml-auto shrink-0 text-xs font-medium text-[#146fc2] hover:underline"
          >
            All notes
          </Link>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          role="group"
          aria-label="Note editor"
        >
          <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/90 px-2 py-1.5">
            {TOOLS.map(({ action, label, Icon }) => (
              <button
                key={action}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => onFormat(action)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
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
            className="w-full resize-y border-0 bg-transparent px-4 py-3 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onSaveNote}
            disabled={busy}
            className="h-9 rounded-lg bg-[#146fc2] px-4 text-sm text-white hover:bg-[#0f5fa8] disabled:opacity-50"
          >
            {savingNote ? 'Saving…' : 'Save note'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDeleteNote}
            disabled={busy || empty}
            className="h-9 gap-1.5 border-slate-200 px-3 text-sm text-slate-600 hover:border-red-200 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {deletingNote ? 'Deleting…' : 'Delete'}
          </Button>
          {noteStatus ? (
            <p className="text-xs text-slate-500" role="status">
              {noteStatus}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
