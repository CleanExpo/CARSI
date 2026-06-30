'use client';

import { Download } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { CourseFormattedBody } from '@/components/lms/CourseFormattedBody';
import { DriveFileViewer } from '@/components/lms/DriveFileViewer';
import { dash } from '@/lib/dashboard-light-ui';
import { EnterpriseLessonContent } from '@/components/onboarding/EnterpriseLessonContent';
import { EnterpriseLessonHeader } from '@/components/onboarding/EnterpriseLessonHeader';
import { EnterpriseLessonSidebar } from '@/components/onboarding/EnterpriseLessonSidebar';
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
  resources?: { label?: string; url?: string }[];
  footer?: ReactNode;
  variant?: 'default' | 'enterprise';
  moduleTitle?: string | null;
  completed?: boolean;
  lessonNumber?: number | null;
  totalLessons?: number | null;
  moduleLessonNumber?: number | null;
  moduleLessonTotal?: number | null;
  courseProgressPercent?: number | null;
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
}: LessonPlayerProps) {
  const downloads = resources.filter((r) => r.url && r.label);
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
              <EnterpriseLessonContent lesson={lesson} />
            </div>
            {downloads.length > 0 ? (
              <DownloadsPanel downloads={downloads} enterprise />
            ) : null}
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

      <div className="rounded-lg">{renderDefaultContent(lesson)}</div>

      {downloads.length > 0 ? <DownloadsPanel downloads={downloads} /> : null}
      {footer}
    </div>
  );
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
      return <CourseFormattedBody text={lesson.content_body} tone="light" />;
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
