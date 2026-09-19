import Link from 'next/link';

import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { CourseFormattedBody } from '@/components/lms/CourseFormattedBody';
import { CourseHubContext } from '@/components/lms/CourseHubContext';
import { CoursesIndexLink } from '@/components/lms/CoursesIndexLink';
import { CourseThumbnail } from '@/components/lms/CourseThumbnail';
import { EnrolButton } from '@/components/lms/EnrolButton';
import type { DesignationDefinition } from '@/lib/designations/registry';

export type CoursePublicDetailModel = {
  slug: string;
  title: string;
  description?: string | null;
  short_description?: string | null;
  price_aud: string;
  is_free: boolean;
  level?: string | null;
  category?: string | null;
  cec_hours?: string | null;
  duration_hours?: string | null;
  thumbnailUrl: string | null;
  module_count?: number | null;
  lesson_count?: number | null;
  syllabus?: {
    id: string;
    title: string;
    duration_minutes?: number | null;
    lessons: {
      id: string;
      title: string;
      is_preview: boolean;
      duration_minutes?: number | null;
      preview_body?: string | null;
    }[];
  }[];
  instructor?: { full_name: string } | null;
  intro_video_url?: string | null;
};

function youtubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1` : null;
}

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
      {children}
    </span>
  );
}

export function CoursePublicDetail({
  course,
  designation,
  priceLabel,
  priceNum,
  learningOutcomes,
  audienceItems,
  previewLesson,
  aggregateRating,
}: {
  course: CoursePublicDetailModel;
  designation: DesignationDefinition | null;
  priceLabel: string;
  priceNum: number;
  learningOutcomes: string[];
  audienceItems: string[];
  previewLesson?: { title: string; preview_body: string } | null;
  aggregateRating?: { ratingValue: number; reviewCount: number } | null;
}) {
  const lead =
    course.short_description ??
    'Australian-produced restoration training built for Southern-Hemisphere conditions.';

  const stats = [
    { value: priceLabel, label: course.is_free || priceNum === 0 ? 'No cost' : 'Price' },
    {
      value: course.duration_hours ? `${course.duration_hours}h` : 'Own pace',
      label: 'Duration',
    },
    {
      value: course.cec_hours ?? '—',
      label: course.cec_hours ? 'Approved CECs' : 'CEC hours',
    },
    { value: '24/7', label: 'Online access' },
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_15%_0%,rgba(36,144,237,0.11),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} pt-8 pb-14 md:pt-10 md:pb-16`}>
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <li>
                <Link href="/" className="hover:text-[#146fc2]">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <CoursesIndexLink className="hover:text-[#146fc2]">Courses</CoursesIndexLink>
              </li>
              <li aria-hidden>/</li>
              <li className="max-w-[28ch] truncate text-slate-700">{course.title}</li>
            </ol>
          </nav>

          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:gap-16">
            <div>
              <p className={LANDING_EYEBROW_CLASS}>Course</p>
              <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.1rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[2.85rem] md:leading-[1.06]">
                {course.title}
              </h1>
              {designation ? (
                <p className="mt-3 text-sm font-semibold text-[#a85500]">
                  Earns the {designation.name}
                </p>
              ) : null}
              <p className={`mt-5 max-w-2xl text-pretty ${LANDING_LEAD_CLASS}`}>{lead}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {course.level ? <Pill>{course.level}</Pill> : null}
                {course.category ? <Pill>{course.category}</Pill> : null}
                {course.cec_hours ? <Pill>{`${course.cec_hours} CECs`}</Pill> : null}
              </div>

              {aggregateRating ? (
                <p className="mt-5 text-sm text-slate-600">
                  <span className="font-semibold text-slate-950">
                    {aggregateRating.ratingValue.toFixed(1)}
                  </span>{' '}
                  from {aggregateRating.reviewCount} review
                  {aggregateRating.reviewCount === 1 ? '' : 's'}
                </p>
              ) : null}

              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-800">
                  A CARSI-issued credential — not an IICRC certification.
                </span>{' '}
                CARSI is an IICRC CEC Accredited provider. IICRC certification is obtained through a
                school and examination approved by the IICRC.{' '}
                <Link
                  href="/verify/training-record"
                  className="font-semibold text-[#146fc2] underline underline-offset-4"
                >
                  Verify a credential
                </Link>
                .
              </p>

              {course.instructor ? (
                <p className="mt-6 text-sm text-slate-500">
                  Instructor{' '}
                  <span className="font-medium text-slate-900">{course.instructor.full_name}</span>
                </p>
              ) : null}

              <div className="mt-8 lg:hidden">
                <EnrolButton slug={course.slug} priceAud={priceNum} isFree={course.is_free} />
              </div>
            </div>

            <aside className="lg:sticky lg:top-28">
              {course.intro_video_url ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-black shadow-[0_20px_50px_-28px_rgba(15,23,42,0.22)]">
                  {youtubeEmbed(course.intro_video_url) ? (
                    <iframe
                      src={youtubeEmbed(course.intro_video_url) ?? ''}
                      title={`${course.title} — intro video`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="aspect-video w-full"
                    />
                  ) : (
                    <video
                      controls
                      preload="metadata"
                      poster={course.thumbnailUrl ?? undefined}
                      className="aspect-video w-full"
                      src={course.intro_video_url}
                    />
                  )}
                </div>
              ) : course.thumbnailUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.22)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={course.thumbnailUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm [&>div]:mb-0">
                  <CourseThumbnail
                    src={null}
                    title={course.title}
                    compact
                    category={course.category}
                    discipline={designation?.disciplineTopic ?? null}
                    priceLabel={
                      course.is_free || priceNum === 0 ? 'Free' : `$${priceNum.toFixed(0)} AUD`
                    }
                    isFree={course.is_free || priceNum === 0}
                    level={course.level}
                    cecHoursLabel={course.cec_hours}
                    durationHours={course.duration_hours}
                  />
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.18)]">
                <p className="font-[family-name:var(--font-display)] text-[2rem] font-semibold tracking-[-0.03em] text-slate-950">
                  {priceLabel}
                  {!course.is_free && priceNum > 0 ? (
                    <span className="ml-1.5 text-sm font-medium text-slate-400">AUD</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {course.is_free || priceNum === 0
                    ? 'Free access — no payment required'
                    : 'One-time payment — lifetime access'}
                </p>
                <div className="mt-6">
                  <EnrolButton slug={course.slug} priceAud={priceNum} isFree={course.is_free} />
                </div>
                <p className="mt-4 text-center text-xs text-slate-500">
                  or included with{' '}
                  <Link href="/subscribe" className="font-semibold text-[#146fc2]">
                    CARSI Pro
                  </Link>{' '}
                  — $795/yr
                </p>
              </div>

              <div className="mt-4 hidden lg:block">
                <CourseHubContext
                  discipline={designation?.disciplineTopic ?? ''}
                  slug={course.slug}
                />
              </div>
            </aside>
          </div>
        </div>
      </section>

      <HomeTrustStrip stats={stats} />

      {course.description ? (
        <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <div className="grid gap-12 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)] lg:gap-20">
              <div>
                <p className={LANDING_EYEBROW_CLASS}>About this course</p>
                <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>What you will work through</h2>
              </div>
              <div className="max-w-3xl">
                <CourseFormattedBody text={course.description} tone="light" />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Outcomes</p>
          <h2 className={`mt-3 max-w-xl ${LANDING_DISPLAY_H2_CLASS}`}>What you will take back to site</h2>
          <div className="mt-12 grid gap-10 border-t border-slate-200/70 pt-10 md:grid-cols-2 lg:grid-cols-3">
            {learningOutcomes.map((outcome, i) => (
              <div
                key={outcome}
                className="md:border-l md:border-slate-200/70 md:pl-8 md:first:border-l-0 md:first:pl-0"
              >
                <p className="font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold text-slate-300 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {course.syllabus && course.syllabus.length > 0 ? (
        <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>Syllabus</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>How the course is built</h2>
            <p className={`mt-4 max-w-xl ${LANDING_LEAD_CLASS}`}>
              {course.syllabus.length} module{course.syllabus.length === 1 ? '' : 's'}
              {course.lesson_count
                ? ` · ${course.lesson_count} lesson${course.lesson_count === 1 ? '' : 's'}`
                : ''}
              {course.duration_hours ? ` · ${course.duration_hours}` : ''}
            </p>
            <ol className="mt-12 divide-y divide-slate-200/80 border-y border-slate-200/80">
              {course.syllabus.map((mod, modIndex) => (
                <li key={mod.id} className="grid gap-4 py-7 sm:grid-cols-[4.5rem_1fr] sm:gap-8">
                  <p className="font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold text-slate-300 tabular-nums">
                    {String(modIndex + 1).padStart(2, '0')}
                  </p>
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                      {mod.title}
                      {typeof mod.duration_minutes === 'number' ? (
                        <span className="ml-2 text-sm font-normal text-slate-400">
                          {mod.duration_minutes} min
                        </span>
                      ) : null}
                    </h3>
                    {mod.lessons.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {mod.lessons.map((lesson) => (
                          <li key={lesson.id} className="text-sm text-slate-500">
                            {lesson.title}
                            {lesson.is_preview ? (
                              <span className="ml-2 text-[11px] font-medium text-[#146fc2]">
                                Preview
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {previewLesson?.preview_body ? (
        <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>Free lesson</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>{previewLesson.title}</h2>
            <p className="mt-2 text-sm text-slate-500">No account needed</p>
            <div className="mt-10 max-w-3xl">
              <CourseFormattedBody text={previewLesson.preview_body} tone="light" />
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Who it is for</p>
          <h2 className={`mt-3 max-w-xl ${LANDING_DISPLAY_H2_CLASS}`}>Built for crews who cannot leave site</h2>
          <ul className="mt-12 max-w-2xl space-y-4">
            {audienceItems.map((item) => (
              <li key={item} className="border-l-2 border-[#2490ed]/35 pl-5 text-sm leading-relaxed text-slate-600">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 lg:hidden">
            <CourseHubContext discipline={designation?.disciplineTopic ?? ''} slug={course.slug} />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-slate-200/70 bg-[#eef5fb] py-20 md:py-28">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(36,144,237,0.12),transparent_60%)]"
          aria-hidden
        />
        <div className={`relative mx-auto max-w-2xl text-center ${PUBLIC_SHELL_INNER_CLASS}`}>
          <p className={LANDING_EYEBROW_CLASS}>Enrol</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Start this course when the roster allows</h2>
          <p className={`mx-auto mt-5 max-w-lg ${LANDING_LEAD_CLASS}`}>
            {course.cec_hours
              ? `Earn ${course.cec_hours} IICRC CECs and a verifiable digital credential on completion.`
              : 'Complete the course and receive a verifiable digital credential for your portfolio.'}
          </p>
          <div className="mx-auto mt-10 max-w-sm">
            <EnrolButton slug={course.slug} priceAud={priceNum} isFree={course.is_free} />
          </div>
          <div className="mt-8">
            <CoursesIndexLink className="text-sm font-semibold text-[#146fc2]">
              Browse all courses
            </CoursesIndexLink>
          </div>
        </div>
      </section>
    </div>
  );
}
