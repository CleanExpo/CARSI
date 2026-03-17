'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api/client';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface LessonNoteOut {
  id: string;
  lesson_id: string;
  lesson_title: string;
  module_title: string | null;
  course_title: string;
  course_slug: string;
  content: string | null;
  updated_at: string | null;
}

interface CourseGroup {
  course_title: string;
  course_slug: string;
  notes: LessonNoteOut[];
}

function groupByCourse(notes: LessonNoteOut[]): CourseGroup[] {
  const map = new Map<string, CourseGroup>();
  for (const note of notes) {
    const key = note.course_slug;
    if (!map.has(key)) {
      map.set(key, { course_title: note.course_title, course_slug: note.course_slug, notes: [] });
    }
    map.get(key)!.notes.push(note);
  }
  return Array.from(map.values());
}

interface NoteCardProps {
  note: LessonNoteOut;
  isEditing: boolean;
  editContent: string;
  onEditStart: (lessonId: string, current: string) => void;
  onEditChange: (val: string) => void;
  onEditSave: (lessonId: string) => Promise<void>;
  onEditCancel: () => void;
  onDelete: (lessonId: string) => Promise<void>;
  saving: boolean;
  deleting: string | null;
}

function NoteCard({
  note,
  isEditing,
  editContent,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
  saving,
  deleting,
}: NoteCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5">
      {/* Lesson heading */}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm leading-snug font-semibold text-white">{note.lesson_title}</h3>
        {note.module_title && (
          <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
            {note.module_title}
          </p>
        )}
      </div>

      {/* Note body */}
      {isEditing ? (
        <textarea
          className="w-full resize-none rounded-sm border border-white/[0.06] bg-zinc-800 p-3 text-sm text-white focus:border-white/20 focus:outline-none"
          rows={5}
          value={editContent}
          onChange={(e) => onEditChange(e.target.value)}
          aria-label={`Edit note for ${note.lesson_title}`}
          disabled={saving}
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap text-white/70">
          {note.content ?? <span className="text-white/30 italic">No content yet.</span>}
        </p>
      )}

      {/* Updated timestamp (read-only mode) */}
      {!isEditing && note.updated_at && (
        <p className="font-mono text-xs text-white/30">
          Last updated {formatDate(note.updated_at)}
        </p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
        {/* Go to lesson — always visible */}
        <Link
          href={`/student/lessons/${note.lesson_id}`}
          className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-white/70 transition-colors hover:border-white/20 hover:text-white"
        >
          Go to lesson
        </Link>

        {isEditing ? (
          <>
            <button
              onClick={() => onEditSave(note.lesson_id)}
              disabled={saving}
              className="rounded-sm border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 font-mono text-xs text-cyan-400 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onEditCancel}
              disabled={saving}
              className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onEditStart(note.lesson_id, note.content ?? '')}
              className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(note.lesson_id)}
              disabled={deleting === note.lesson_id}
              className="ml-auto rounded-sm border border-red-500/20 bg-red-500/5 px-3 py-1.5 font-mono text-xs text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleting === note.lesson_id ? 'Deleting…' : 'Delete'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 px-6 py-12 text-center">
      <FileText className="h-10 w-10 text-white/10" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-white/40">No notes yet.</p>
        <p className="text-sm text-white/30">
          Open any lesson and jot notes as you learn. They&apos;ll all appear here.
        </p>
      </div>
      <Link
        href="/courses"
        className="mt-2 rounded-sm border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-mono text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white"
      >
        Browse Courses
      </Link>
    </div>
  );
}

export default function StudentNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<LessonNoteOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline edit state
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<LessonNoteOut[]>('/api/lms/notes/me');
      setNotes(data);
    } catch {
      setError('Failed to load notes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  function handleEditStart(lessonId: string, current: string) {
    setEditingLessonId(lessonId);
    setEditContent(current);
  }

  function handleEditCancel() {
    setEditingLessonId(null);
    setEditContent('');
    setError(null);
  }

  async function handleEditSave(lessonId: string) {
    setSaving(true);
    try {
      const updated = await apiClient.put<LessonNoteOut>(`/api/lms/notes/${lessonId}`, {
        content: editContent,
      });
      setNotes((prev) => prev.map((n) => (n.lesson_id === lessonId ? updated : n)));
      setEditingLessonId(null);
      setEditContent('');
    } catch {
      setError('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const handleDelete = useCallback(
    async (lessonId: string) => {
      setDeleting(lessonId);
      try {
        await apiClient.delete(`/api/lms/notes/${lessonId}`);
        setNotes((prev) => prev.filter((n) => n.lesson_id !== lessonId));
        if (editingLessonId === lessonId) {
          setEditingLessonId(null);
          setEditContent('');
        }
      } catch {
        setError('Failed to delete note. Please try again.');
      } finally {
        setDeleting(null);
      }
    },
    [editingLessonId]
  );

  const groups = groupByCourse(notes);
  const totalCourses = groups.length;

  return (
    <main className="flex max-w-4xl flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-bold text-white">My Notes</h1>
        <p className="text-sm text-white/40">Your private notes from each lesson.</p>
      </div>

      {/* Loading */}
      {loading && <p className="text-sm text-white/30">Loading notes…</p>}

      {/* Error */}
      {error && <ErrorBanner message={error} onRetry={fetchNotes} />}

      {/* Note count summary */}
      {!loading && !error && notes.length > 0 && (
        <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'} across {totalCourses}{' '}
          {totalCourses === 1 ? 'course' : 'courses'}
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && notes.length === 0 && <EmptyState />}

      {/* Grouped notes */}
      {!loading && !error && notes.length > 0 && (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.course_slug} className="flex flex-col gap-4">
              {/* Course group header */}
              <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
                {group.course_title}
              </h2>

              {/* Note cards */}
              <div className="flex flex-col gap-3">
                {group.notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isEditing={editingLessonId === note.lesson_id}
                    editContent={editContent}
                    onEditStart={handleEditStart}
                    onEditChange={setEditContent}
                    onEditSave={handleEditSave}
                    onEditCancel={handleEditCancel}
                    onDelete={handleDelete}
                    saving={saving}
                    deleting={deleting}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
