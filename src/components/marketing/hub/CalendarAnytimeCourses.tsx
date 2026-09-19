import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

export type CalendarCourseRow = {
  slug: string;
  title: string;
  href: string;
  summary: string | null;
  topic: string;
  availability: string;
  isFree: boolean;
  priceLabel: string | null;
};

export function CalendarAnytimeCourses({
  topics,
  courseCount,
}: {
  topics: { topic: string; courses: CalendarCourseRow[] }[];
  courseCount: number;
}) {
  if (topics.length === 0) return null;

  return (
    <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Start any time</p>
        <h2 id="carsi-courses-heading" className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
          CARSI Australian courses
        </h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          Self-paced training with no invented dates. {courseCount} course
          {courseCount === 1 ? '' : 's'} produced for Australian standards, voltages and units.
        </p>
        <div className="mt-12 space-y-12">
          {topics.map(({ topic, courses }) => (
            <div key={topic}>
              <h3 className="text-sm font-semibold text-slate-950">{topic}</h3>
              <ul className="mt-5 divide-y divide-slate-200/80 border-y border-slate-200/80">
                {courses.map((course, i) => (
                  <li key={course.slug}>
                    <Link
                      href={course.href}
                      className="group grid gap-3 py-5 sm:grid-cols-[4.5rem_1fr_auto] sm:items-baseline"
                    >
                      <span className="font-[family-name:var(--font-display)] text-[1.6rem] leading-none font-semibold text-slate-300 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>
                        <span className="block font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950 group-hover:text-[#146fc2]">
                          {course.title}
                        </span>
                        {course.summary ? (
                          <span className="mt-1 block text-sm text-slate-500">{course.summary}</span>
                        ) : null}
                        <span className="mt-1 block text-xs text-slate-400">{course.availability}</span>
                      </span>
                      <span className="text-sm font-semibold text-[#146fc2]">
                        {course.isFree ? 'Free' : (course.priceLabel ?? 'Open')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
