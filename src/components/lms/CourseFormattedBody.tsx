import { stripLegacyPurchaseCta } from '@/lib/lms/format-course-body';
import { sourceToStudentHtml } from '@/lib/lms/visual-course-html';
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

const proseByTone = {
  light:
    'prose prose-slate max-w-none text-sm leading-relaxed prose-headings:scroll-mt-20 prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-p:leading-relaxed prose-a:text-[#146fc2] prose-img:max-w-full prose-img:rounded-lg prose-table:text-sm prose-pre:overflow-x-auto prose-pre:rounded-xl',
  dark:
    'prose prose-invert max-w-none text-sm leading-relaxed prose-p:leading-relaxed prose-img:max-w-full prose-img:rounded-lg prose-table:text-sm prose-pre:overflow-x-auto prose-pre:rounded-xl ' +
    '[&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_h4]:!text-white [&_h5]:!text-white [&_h6]:!text-white ' +
    '[&_h1_*]:!text-white [&_h2_*]:!text-white [&_h3_*]:!text-white [&_h4_*]:!text-white ' +
    '[&_p]:!text-white/80 [&_li]:!text-white/80 [&_strong]:!text-white [&_a]:!text-[#c8e6ff] [&_blockquote]:!text-white/70 [&_code]:!text-white',
} as const;

const articleLayoutShared =
  "course-article-body w-full max-w-none text-left font-['Times_New_Roman',Times,serif] text-[19px] leading-[1.85] " +
  '[&_p]:mb-6 [&_p]:text-left [&_p]:text-[19px] [&_p]:leading-[1.85] ' +
  '[&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1.5 [&_blockquote]:my-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic ' +
  '[&_.course-mod]:flex [&_.course-mod]:flex-col [&_.course-mod]:gap-1 ' +
  '[&_.course-mod-kicker]:font-sans [&_.course-mod-kicker]:text-[11px] [&_.course-mod-kicker]:font-bold [&_.course-mod-kicker]:tracking-[0.2em] [&_.course-mod-kicker]:uppercase ' +
  '[&_.course-mod-title]:text-[1.5rem] [&_.course-mod-title]:not-italic';

const articleLayoutDark =
  '[&_p]:!text-white/90 ' +
  '[&_h1+p::first-letter]:float-left [&_h1+p::first-letter]:mr-3 [&_h1+p::first-letter]:mt-1 ' +
  '[&_h1+p::first-letter]:text-[4.1rem] [&_h1+p::first-letter]:leading-[0.78] [&_h1+p::first-letter]:!text-[#fff3d6]';

export function CourseFormattedBody({
  text,
  className,
  tone = 'dark',
  layout = 'default',
}: CourseFormattedBodyProps) {
  const raw = stripLegacyPurchaseCta(text ?? '').trim();
  if (!raw) return null;

  const safe = sourceToStudentHtml(raw);
  if (!safe) return null;

  return (
    <div
      className={cn(
        layout === 'article' ? articleLayoutShared : proseByTone[tone],
        layout === 'article' && tone === 'dark' && articleLayoutDark,
        layout === 'article' && tone === 'light' && 'course-article-body--light',
        className
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
