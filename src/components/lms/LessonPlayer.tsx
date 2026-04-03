import { DriveFileViewer } from '@/components/lms/DriveFileViewer';
import { Badge } from '@/components/ui/badge';
import DOMPurify from 'isomorphic-dompurify';
import { Download } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

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
}

export function LessonPlayer({ lesson, resources = [], footer }: LessonPlayerProps) {
  const downloads = resources.filter((r) => r.url && r.label);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <h1 className="flex-1 text-2xl font-bold text-white">{lesson.title}</h1>
        <div className="flex shrink-0 gap-2">
          {lesson.is_preview && (
            <Badge variant="outline" className="border-white/20 text-white/70">
              Preview
            </Badge>
          )}
          {lesson.duration_minutes ? (
            <span className="text-sm text-white/45">{lesson.duration_minutes} min</span>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg">{renderContent(lesson)}</div>

      {downloads.length > 0 && (
        <div
          className="rounded-lg border border-white/[0.08] p-4"
          style={{ background: 'rgba(36,144,237,0.06)' }}
        >
          <p className="mb-3 text-xs font-semibold tracking-wider text-white/50 uppercase">
            Downloads & resources
          </p>
          <ul className="space-y-2">
            {downloads.map((r, i) => (
              <li key={`${r.url}-${i}`}>
                <Link
                  href={r.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#7ec5ff] hover:underline"
                >
                  <Download className="h-4 w-4 shrink-0 opacity-80" />
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {footer}
    </div>
  );
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      const m = u.pathname.match(/\/embed\/([^/]+)/);
      if (m?.[1]) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
      const s = u.pathname.match(/\/shorts\/([^/]+)/);
      if (s?.[1]) return `https://www.youtube-nocookie.com/embed/${s[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

function vimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes('vimeo.com')) return null;
    const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
    return m?.[1] ? `https://player.vimeo.com/video/${m[1]}` : null;
  } catch {
    return null;
  }
}

function renderContent(lesson: Lesson) {
  switch (lesson.content_type) {
    case 'video': {
      const src = lesson.content_body?.trim() ?? '';
      if (!src) return <p className="text-white/50">No video URL configured.</p>;
      const yt = youtubeEmbedUrl(src);
      if (yt) {
        return (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              title="Video lesson"
              src={yt}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        );
      }
      const vm = vimeoEmbedUrl(src);
      if (vm) {
        return (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              title="Video lesson"
              src={vm}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      return (
        <video controls className="w-full rounded-lg bg-black" src={src}>
          Your browser does not support video playback.
        </video>
      );
    }

    case 'pdf':
      return (
        <iframe
          src={lesson.content_body ?? undefined}
          className="h-[min(70vh,700px)] w-full rounded-lg border border-white/10"
          title="PDF viewer"
        />
      );

    case 'drive_file':
      if (!lesson.drive_file_id) return <p className="text-white/50">No file attached.</p>;
      return <DriveFileViewer driveFileId={lesson.drive_file_id} />;

    case 'text':
    default: {
      const safe = DOMPurify.sanitize(lesson.content_body ?? '');
      return (
        <div
          className="prose prose-invert prose-headings:text-white prose-p:text-white/85 max-w-none"
          dangerouslySetInnerHTML={{ __html: safe }}
        />
      );
    }
  }
}
