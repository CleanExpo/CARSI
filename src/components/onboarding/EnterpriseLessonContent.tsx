'use client';

import DOMPurify from 'isomorphic-dompurify';
import { ListChecks, Sparkles } from 'lucide-react';

import { CourseFormattedBody } from '@/components/lms/CourseFormattedBody';
import { DriveFileViewer } from '@/components/lms/DriveFileViewer';
import { looksLikeHtmlFragment } from '@/lib/lms/format-course-body';
import {
  parseHtmlLessonBlocks,
  splitListItemTitle,
} from '@/lib/onboarding/parse-html-lesson';
import type { ReactNode } from 'react';

type LessonShape = {
  content_type: string | null;
  content_body: string | null;
  drive_file_id: string | null;
};

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

function HtmlParagraph({
  html,
  variant,
}: {
  html: string;
  variant: 'intro' | 'body';
}) {
  const safe = DOMPurify.sanitize(html);
  if (variant === 'intro') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-[#2490ed]/20 bg-gradient-to-br from-[#eef7ff] via-white to-white p-6 sm:p-7">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#2490ed]/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#146fc2]" aria-hidden />
          <div
            className="prose prose-slate max-w-none text-base leading-relaxed prose-p:my-0 prose-p:text-slate-800 prose-strong:text-slate-900"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="prose prose-slate max-w-none text-[17px] leading-[1.75] prose-p:my-0 prose-p:text-slate-700 prose-strong:font-semibold prose-strong:text-slate-900 prose-em:text-slate-600"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function HtmlListBlock({ items }: { items: Array<{ html: string }> }) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <ListChecks className="h-4 w-4 text-[#146fc2]" aria-hidden />
        Key concepts
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item, i) => {
          const { title, body } = splitListItemTitle(item.html);
          const safe = DOMPurify.sanitize(item.html);
          return (
            <li
              key={i}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:border-[#2490ed]/30 hover:shadow-md"
            >
              {title ? (
                <>
                  <p className="font-semibold text-slate-900">{title}</p>
                  {body ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
                  ) : (
                    <div
                      className="mt-1.5 text-sm leading-relaxed text-slate-600 prose-p:my-0"
                      dangerouslySetInnerHTML={{ __html: safe.replace(/<strong[^>]*>[\s\S]*?<\/strong>/i, '') }}
                    />
                  )}
                </>
              ) : (
                <div
                  className="text-sm leading-relaxed text-slate-700 prose-p:my-0"
                  dangerouslySetInnerHTML={{ __html: safe }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StructuredHtmlLesson({ html }: { html: string }) {
  const blocks = parseHtmlLessonBlocks(html);
  let introUsed = false;

  return (
    <div className="space-y-8">
      {blocks.map((block, i) => {
        if (block.type === 'list') {
          return <HtmlListBlock key={`list-${i}`} items={block.items} />;
        }
        const isIntro = !introUsed;
        introUsed = true;
        return (
          <HtmlParagraph
            key={`p-${i}`}
            html={block.html}
            variant={isIntro ? 'intro' : 'body'}
          />
        );
      })}
    </div>
  );
}

function VideoFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-slate-900 shadow-lg shadow-slate-300/40 ring-1 ring-slate-200">
      <div className="aspect-video w-full">{children}</div>
    </div>
  );
}

export function EnterpriseLessonContent({ lesson }: { lesson: LessonShape }) {
  switch (lesson.content_type) {
    case 'video': {
      const src = lesson.content_body?.trim() ?? '';
      if (!src) return <EmptyState message="No video URL configured for this lesson yet." />;
      const yt = youtubeEmbedUrl(src);
      if (yt) {
        return (
          <VideoFrame>
            <iframe
              title="Training video"
              src={yt}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </VideoFrame>
        );
      }
      const vm = vimeoEmbedUrl(src);
      if (vm) {
        return (
          <VideoFrame>
            <iframe
              title="Training video"
              src={vm}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </VideoFrame>
        );
      }
      return (
        <VideoFrame>
          <video controls className="h-full w-full" src={src}>
            Your browser does not support video playback.
          </video>
        </VideoFrame>
      );
    }

    case 'pdf':
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <iframe
            src={lesson.content_body ?? undefined}
            className="h-[min(72vh,760px)] w-full"
            title="PDF viewer"
          />
        </div>
      );

    case 'drive_file':
      if (!lesson.drive_file_id) return <EmptyState message="No file attached." />;
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <DriveFileViewer driveFileId={lesson.drive_file_id} />
        </div>
      );

    case 'text':
    default: {
      const raw = lesson.content_body?.trim() ?? '';
      if (!raw) return <EmptyState message="Lesson content will appear here once published." />;
      if (looksLikeHtmlFragment(raw)) {
        return <StructuredHtmlLesson html={raw} />;
      }
      return (
        <div className="space-y-6">
          <CourseFormattedBody text={raw} tone="light" className="text-[17px] leading-[1.75]" />
        </div>
      );
    }
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
