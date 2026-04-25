import DOMPurify from 'isomorphic-dompurify';

import { cn } from '@/lib/utils';
import { looksLikeHtmlFragment, parseCourseBody } from '@/lib/lms/format-course-body';

export interface CourseFormattedBodyProps {
  /** Raw course description (plain conventions or legacy HTML). */
  text: string | null | undefined;
  className?: string;
}

const blockGap = 'space-y-4';

export function CourseFormattedBody({ text, className }: CourseFormattedBodyProps) {
  const raw = text?.trim() ?? '';
  if (!raw) return null;

  if (looksLikeHtmlFragment(raw)) {
    const safe = DOMPurify.sanitize(raw);
    return (
      <div
        className={cn(
          'prose prose-invert prose-headings:text-white/90 prose-p:text-white/70 prose-li:text-white/70 max-w-none text-sm leading-relaxed prose-p:leading-relaxed',
          className
        )}
        // eslint-disable-next-line react/no-danger -- sanitized with DOMPurify (same pattern as LessonPlayer)
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  const blocks = parseCourseBody(raw);
  if (!blocks.length) return null;

  return (
    <div className={cn(blockGap, 'text-sm leading-relaxed', className)}>
      {blocks.map((b, i) => {
        if (b.type === 'h3') {
          return (
            <h3
              key={`h-${i}`}
              className="text-base font-semibold tracking-tight text-white/90"
            >
              {b.text}
            </h3>
          );
        }
        if (b.type === 'quote') {
          return (
            <blockquote
              key={`q-${i}`}
              className="border-l-2 border-[#2490ed]/50 py-0.5 pl-4 text-white/70 italic"
            >
              <p className="whitespace-pre-line">{b.text}</p>
            </blockquote>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={`ul-${i}`} className="list-disc space-y-1 pl-5 text-white/70">
              {b.items.map((item, idx) => (
                <li key={`li-${i}-${idx}`}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${i}`} className="whitespace-pre-line text-white/70">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}
