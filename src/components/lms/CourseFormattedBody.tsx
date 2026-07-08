import DOMPurify from 'isomorphic-dompurify';

import { cn } from '@/lib/utils';
import {
  looksLikeHtmlFragment,
  parseCourseBody,
  stripLegacyPurchaseCta,
} from '@/lib/lms/format-course-body';

export interface CourseFormattedBodyProps {
  /** Raw course description (plain conventions or legacy HTML). */
  text: string | null | undefined;
  className?: string;
  /** Light for dashboard workspace; dark for public marketing pages. */
  tone?: 'light' | 'dark';
}

const blockGap = 'space-y-4';

const proseByTone = {
  light:
    'prose prose-slate max-w-none text-sm leading-relaxed prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-p:leading-relaxed',
  dark: 'prose prose-invert prose-headings:text-white/90 prose-p:text-white/70 prose-li:text-white/70 max-w-none text-sm leading-relaxed prose-p:leading-relaxed',
} as const;

const textByTone = {
  light: {
    h3: 'text-base font-semibold tracking-tight text-slate-900',
    quote: 'border-l-2 border-[#2490ed]/50 py-0.5 pl-4 text-slate-600 italic',
    ul: 'list-disc space-y-1 pl-5 text-slate-700',
    p: 'whitespace-pre-line text-slate-700',
  },
  dark: {
    h3: 'text-base font-semibold tracking-tight text-white/90',
    quote: 'border-l-2 border-[#2490ed]/50 py-0.5 pl-4 text-white/70 italic',
    ul: 'list-disc space-y-1 pl-5 text-white/70',
    p: 'whitespace-pre-line text-white/70',
  },
} as const;

export function CourseFormattedBody({
  text,
  className,
  tone = 'dark',
}: CourseFormattedBodyProps) {
  // Strip the legacy WooCommerce "Already Purchased This Course? → Access Here"
  // lead block (issue #126) at the render path, so every source (DB, backend API,
  // or WP export) is covered and a re-import can't reintroduce the off-site CTA.
  const raw = stripLegacyPurchaseCta(text ?? '').trim();
  if (!raw) return null;

  const styles = textByTone[tone];

  if (looksLikeHtmlFragment(raw)) {
    // ADD_ATTR keeps target="_blank" on external resource links (e.g. SDS PDFs).
    const safe = DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
    return (
      <div
        className={cn(proseByTone[tone], className)}
        // sanitized with DOMPurify above
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
            <h3 key={`h-${i}`} className={styles.h3}>
              {b.text}
            </h3>
          );
        }
        if (b.type === 'quote') {
          return (
            <blockquote key={`q-${i}`} className={styles.quote}>
              <p className="whitespace-pre-line">{b.text}</p>
            </blockquote>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={`ul-${i}`} className={styles.ul}>
              {b.items.map((item, idx) => (
                <li key={`li-${i}-${idx}`}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${i}`} className={styles.p}>
            {b.text}
          </p>
        );
      })}
    </div>
  );
}
