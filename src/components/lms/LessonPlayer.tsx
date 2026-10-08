'use client';

import { Download } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import type { LessonPosition } from '@/lib/lms/lesson-checkpoint';

import { CourseFormattedBody } from '@/components/lms/CourseFormattedBody';
import { DriveFileViewer } from '@/components/lms/DriveFileViewer';
import { FlashcardDeck } from '@/components/lms/FlashcardDeck';
import { SlideDeckViewer } from '@/components/lms/SlideDeckViewer';
import { EnterpriseLessonContent } from '@/components/onboarding/EnterpriseLessonContent';
import { EnterpriseLessonHeader } from '@/components/onboarding/EnterpriseLessonHeader';
import { EnterpriseLessonSidebar } from '@/components/onboarding/EnterpriseLessonSidebar';
import { Badge } from '@/components/ui/badge';
import { dash } from '@/lib/dashboard-light-ui';
import {
  isFlashcardResource,
  isSlidesResource,
  type LessonResource,
} from '@/lib/lms/lesson-resources';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  content_type: string | null;
  content_body: string | null;
  drive_file_id: string | null;
  duration_minutes: number | null;
  is_preview: boolean;
  order_index: number;
  course_id: string;
}

interface LessonPlayerProps {
  lesson: Lesson;
  resources?: LessonResource[];
  footer?: ReactNode;
  variant?: 'default' | 'enterprise';
  moduleTitle?: string | null;
  completed?: boolean;
  lessonNumber?: number | null;
  totalLessons?: number | null;
  moduleLessonNumber?: number | null;
  moduleLessonTotal?: number | null;
  courseProgressPercent?: number | null;
  initialPosition?: LessonPosition;
  onPositionChange?: (position: LessonPosition) => void;
}

export function LessonPlayer({
  lesson,
  resources = [],
  footer,
  variant = 'default',
  moduleTitle,
  completed,
  lessonNumber,
  totalLessons,
  moduleLessonNumber,
  moduleLessonTotal,
  courseProgressPercent,
  initialPosition,
  onPositionChange,
}: LessonPlayerProps) {
  const flashcardDecks = resources.filter(isFlashcardResource);
  const slideResources = resources.filter(isSlidesResource);
  const downloads = resources.filter(
    (r): r is { label?: string; url?: string } =>
      !isFlashcardResource(r) && !isSlidesResource(r) && Boolean(r.url && r.label)
  );
  const enterprise = variant === 'enterprise';

  if (enterprise) {
    return (
      <div className="space-y-8">
        <EnterpriseLessonHeader
          title={lesson.title}
          moduleTitle={moduleTitle}
          lessonNumber={lessonNumber}
          totalLessons={totalLessons}
          moduleLessonNumber={moduleLessonNumber}
          moduleLessonTotal={moduleLessonTotal}
          durationMinutes={lesson.duration_minutes}
          completed={completed}
          isPreview={lesson.is_preview}
          courseProgressPercent={courseProgressPercent}
        />

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)] xl:items-start">
          <div className="min-w-0 space-y-6">
            <div
              className={cn(
                dash.panel,
                'overflow-hidden',
                lesson.content_type === 'video' ? 'p-2 sm:p-3' : 'p-6 sm:p-8 lg:p-10'
              )}
            >
              <PositionedContent lesson={lesson} enterprise initialPosition={initialPosition} onPositionChange={onPositionChange} />
            </div>
            {slideResources.map((slidesResource, i) => (
              <SlideDeckViewer
                key={`slides-${i}`}
                label={slidesResource.label}
                decks={slidesResource.decks}
                enterprise
              />
            ))}
            {flashcardDecks.map((deck, i) => (
              <FlashcardDeck
                key={`flashcards-${i}`}
                label={deck.label}
                cards={deck.cards}
                enterprise
              />
            ))}
            {downloads.length > 0 ? <DownloadsPanel downloads={downloads} enterprise /> : null}
          </div>
          <aside className="xl:sticky xl:top-6">
            <EnterpriseLessonSidebar
              contentBody={lesson.content_body}
              contentType={lesson.content_type}
            />
          </aside>
        </div>

        {footer}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lessonNumber && totalLessons ? (
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Lesson {lessonNumber} of {totalLessons}
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        <h1 className="flex-1 text-2xl font-bold text-slate-900">{lesson.title}</h1>
        <div className="flex shrink-0 gap-2">
          {lesson.is_preview && (
            <Badge variant="outline" className="border-slate-300 text-slate-600">
              Preview
            </Badge>
          )}
          {lesson.duration_minutes ? (
            <span className="text-sm text-slate-500">{lesson.duration_minutes} min</span>
          ) : null}
        </div>
      </div>

      <PositionedContent lesson={lesson} initialPosition={initialPosition} onPositionChange={onPositionChange} />

      {slideResources.map((slidesResource, i) => (
        <SlideDeckViewer
          key={`slides-${i}`}
          label={slidesResource.label}
          decks={slidesResource.decks}
        />
      ))}
      {flashcardDecks.map((deck, i) => (
        <FlashcardDeck key={`flashcards-${i}`} label={deck.label} cards={deck.cards} />
      ))}
      {downloads.length > 0 ? <DownloadsPanel downloads={downloads} /> : null}
      {footer}
    </div>
  );
}

function PositionedContent({ lesson, enterprise, initialPosition, onPositionChange }: {
  lesson: Lesson; enterprise?: boolean; initialPosition?: LessonPosition;
  onPositionChange?: (position: LessonPosition) => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  const initial = useRef(initialPosition);
  const videoRestored = useRef(false);
  const update = useRef(onPositionChange);
  useEffect(() => { update.current = onPositionChange; }, [onPositionChange]);
  useEffect(() => {
    if (lesson.content_type !== 'text' || !body.current) return;
    const element = body.current;
    let restoring = true;
    const frame = requestAnimationFrame(() => {
      if (initial.current?.kind === 'reading' && initial.current.value > 0) {
        const top = window.scrollY + element.getBoundingClientRect().top;
        window.scrollTo({ top: top + (initial.current.value / 10000) * Math.max(0, element.offsetHeight - window.innerHeight), behavior: 'instant' });
      }
      requestAnimationFrame(() => { restoring = false; });
    });
    const scroll = () => {
      if (restoring) return;
      const range = element.offsetHeight - window.innerHeight;
      const proportion = range > 0 ? -element.getBoundingClientRect().top / range : 0;
      update.current?.({ kind: 'reading', value: Math.round(Math.max(0, Math.min(1, proportion)) * 10000) });
    };
    window.addEventListener('scroll', scroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); };
  }, [lesson.id, lesson.content_type]);
  const embedded = /(?:youtube(?:-nocookie)?\.com|youtu\.be|vimeo\.com)/i.test(lesson.content_body ?? '');
  if (lesson.content_type === 'video' && !embedded) return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video controls className="h-full w-full" src={lesson.content_body ?? undefined}
        onLoadedMetadata={(event) => {
          if (initial.current?.kind === 'video') event.currentTarget.currentTime = Math.min(event.currentTarget.duration || 0, initial.current.value / 1000);
          videoRestored.current = true;
        }}
        onTimeUpdate={(event) => { if (videoRestored.current) update.current?.({ kind: 'video', value: Math.min(86400000, Math.round(event.currentTarget.currentTime * 1000)) }); }}>
        Your browser does not support video playback.
      </video>
    </div>
  );
  return <div ref={body} data-testid="lesson-content" className="rounded-lg">{enterprise ? <EnterpriseLessonContent lesson={lesson} /> : renderDefaultContent(lesson)}</div>;
}

function renderDefaultContent(lesson: Lesson) {
  switch (lesson.content_type) {
    case 'video': {
      const src = lesson.content_body?.trim() ?? '';
      if (!src) return <p className="text-slate-500">No video URL configured.</p>;
      return (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video controls className="h-full w-full" src={src}>
            Your browser does not support video playback.
          </video>
        </div>
      );
    }
    case 'pdf':
      return (
        <iframe
          src={lesson.content_body ?? undefined}
          className="h-[min(70vh,700px)] w-full rounded-lg border border-slate-200"
          title="PDF viewer"
        />
      );
    case 'drive_file':
      if (!lesson.drive_file_id) return <p className="text-slate-500">No file attached.</p>;
      return <DriveFileViewer driveFileId={lesson.drive_file_id} />;
    default:
      return <CourseFormattedBody text={lesson.content_body} tone="light" layout="article" />;
  }
}

function DownloadsPanel({
  downloads,
  enterprise,
}: {
  downloads: { label?: string; url?: string }[];
  enterprise?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5',
        enterprise ? 'border-slate-200 bg-white shadow-sm' : 'border-[#2490ed]/20 bg-[#eef7ff]'
      )}
    >
      <p className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
        Downloads & resources
      </p>
      <ul className="space-y-2">
        {downloads.map((r, i) => (
          <li key={`${r.url}-${i}`}>
            <Link
              href={r.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm text-[#146fc2] transition hover:border-slate-200 hover:bg-slate-50"
            >
              <Download className="h-4 w-4 shrink-0 opacity-80" />
              {r.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
