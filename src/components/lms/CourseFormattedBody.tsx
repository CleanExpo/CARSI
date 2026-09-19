import {
  looksLikeHtmlFragment,
  parseCourseBody,
  stripLegacyPurchaseCta,
} from '@/lib/lms/format-course-body';
import {
  looksLikeMarkdown,
  markdownToSafeHtml,
  sanitizeCourseHtml,
} from '@/lib/lms/markdown-course-body';
import { cn } from '@/lib/utils';

export interface CourseFormattedBodyProps {
  /** Raw course description (Markdown, plain conventions, or legacy HTML). */
  text: string | null | undefined;
  className?: string;
  /** Light for dashboard workspace; dark for public marketing pages. */
  tone?: 'light' | 'dark';
  /** Medium-style column: Times, drop cap, module kickers. */
  layout?: 'default' | 'article';
}

const blockGap = 'space-y-4';

const proseByTone = {
  light:
    'prose prose-slate max-w-none text-sm leading-relaxed prose-headings:scroll-mt-20 prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-p:leading-relaxed prose-a:text-[#146fc2] prose-img:max-w-full prose-img:rounded-lg prose-table:text-sm prose-pre:overflow-x-auto prose-pre:rounded-xl',
  dark:
    'prose prose-invert max-w-none text-sm leading-relaxed prose-p:leading-relaxed prose-img:max-w-full prose-img:rounded-lg prose-table:text-sm prose-pre:overflow-x-auto prose-pre:rounded-xl ' +
    '[&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_h4]:!text-white [&_h5]:!text-white [&_h6]:!text-white ' +
    '[&_h1_*]:!text-white [&_h2_*]:!text-white [&_h3_*]:!text-white [&_h4_*]:!text-white ' +
    '[&_p]:!text-white/80 [&_li]:!text-white/80 [&_strong]:!text-white [&_a]:!text-[#c8e6ff] [&_blockquote]:!text-white/70 [&_code]:!text-white',
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

const articleLayout =
  "course-article-body w-full max-w-none text-left font-['Times_New_Roman',Times,serif] text-[19px] leading-[1.85] " +
  '[&_p]:mb-6 [&_p]:text-left [&_p]:text-[19px] [&_p]:leading-[1.85] [&_p]:!text-white/90 ' +
  '[&_h1+p::first-letter]:float-left [&_h1+p::first-letter]:mr-3 [&_h1+p::first-letter]:mt-1 ' +
  '[&_h1+p::first-letter]:text-[4.1rem] [&_h1+p::first-letter]:leading-[0.78] [&_h1+p::first-letter]:!text-[#fff3d6] ' +
  '[&_.course-mod]:flex [&_.course-mod]:flex-col [&_.course-mod]:gap-1 ' +
  '[&_.course-mod-kicker]:font-sans [&_.course-mod-kicker]:text-[11px] [&_.course-mod-kicker]:font-bold [&_.course-mod-kicker]:tracking-[0.2em] [&_.course-mod-kicker]:uppercase ' +
  '[&_.course-mod-title]:text-[1.5rem] [&_.course-mod-title]:not-italic';

export function CourseFormattedBody({
  text,
  className,
  tone = 'dark',
  layout = 'default',
}: CourseFormattedBodyProps) {
  const raw = stripLegacyPurchaseCta(text ?? '').trim();
  if (!raw) return null;

  const styles = textByTone[tone];

  if (looksLikeHtmlFragment(raw)) {
    const safe = sanitizeCourseHtml(raw);
    if (!safe) return null;
    return (
      <div
        className={cn(
          layout === 'article' ? 'prose max-w-none' : proseByTone[tone],
          layout === 'article' && articleLayout,
          className
        )}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  if (looksLikeMarkdown(raw)) {
    const safe = markdownToSafeHtml(raw);
    if (!safe) return null;
    return (
      <div
        className={cn(
          layout === 'article' ? 'prose max-w-none' : proseByTone[tone],
          layout === 'article' && articleLayout,
          className
        )}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  const blocks = parseCourseBody(raw);
  if (!blocks.length) return null;

  return (
    <div
      className={cn(
        blockGap,
        'text-sm leading-relaxed',
        layout === 'article' && articleLayout,
        className
      )}
    >
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
