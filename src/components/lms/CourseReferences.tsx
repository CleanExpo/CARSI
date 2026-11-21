import { ExternalLink } from 'lucide-react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import type { CourseReference } from '@/lib/seo/course-references';

/** Anchor id llms.txt points to (`/courses/<slug>#references`). */
export const COURSE_REFERENCES_ANCHOR = 'references';

/**
 * Public References block (BACKLOG #22): the sources a course's lessons cite in their
 * "Sources for this lesson" lists, and nothing else. Renders nothing for a course with none.
 */
export function CourseReferences({ references }: { references: readonly CourseReference[] }) {
  if (references.length === 0) return null;
  return (
    <section
      id={COURSE_REFERENCES_ANCHOR}
      aria-labelledby="course-references-heading"
      className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="grid gap-12 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)] lg:gap-20">
          <div>
            <p className={LANDING_EYEBROW_CLASS}>References</p>
            <h2 id="course-references-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Sources this course cites
            </h2>
            <p className={`mt-4 max-w-md ${LANDING_LEAD_CLASS}`}>
              Gathered from the source list at the end of each lesson. Standards are named by number
              and edition only.
            </p>
          </div>
          <ol className="max-w-3xl divide-y divide-slate-200/80 border-y border-slate-200/80">
            {references.map((ref) => (
              <li
                key={ref.url ?? ref.label}
                className="py-4 text-sm leading-relaxed text-slate-700"
              >
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#146fc2] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
                  >
                    {ref.label}
                    <ExternalLink
                      className="ml-1 inline h-3.5 w-3.5 align-[-2px]"
                      aria-hidden="true"
                    />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="font-medium text-slate-900">{ref.label}</span>
                )}
                {ref.readOn ? (
                  <span className="ml-2 text-xs text-slate-500">Read {ref.readOn}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
