'use client';

import { CourseThumbnail } from '@/components/lms/CourseThumbnail';
import { formatCecHoursForDisplay } from '@/lib/cec-display';
import { formatLearnerActivity } from '@/lib/learner-course-cta';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { getOnboardingLearnPath, getOnboardingProgramPath } from '@/lib/onboarding/navigation';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const surface = 'learner-home-surface learner-home-card overflow-hidden rounded-[1.25rem]';
const inset = 'learner-home-inset';
const kicker =
  'bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-200 bg-clip-text text-[11px] font-semibold tracking-[0.2em] text-transparent uppercase';
const heading = 'font-semibold tracking-[-0.02em] text-white';
const muted = 'text-slate-300/80';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-white via-sky-50 to-white px-4 py-2 text-[13px] font-semibold text-slate-950 shadow-[0_10px_28px_-10px_rgba(56,189,248,0.8)] transition hover:from-sky-50 hover:to-white';
const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[13px] font-semibold text-sky-100 transition hover:border-sky-200/40 hover:bg-white/10';

export interface EnrollmentListItem {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  status: string;
  enrolled_at: string;
  completion_percentage: number;
  thumbnail_url?: string | null;
  last_lesson_id?: string | null;
  last_lesson_title?: string | null;
  last_activity_at?: string | null;
  completed_at?: string | null;
  all_lessons_complete?: boolean;
  certificate_issued_at?: string | null;
  cec_submission_status?: string | null;
  cec_submitted_at?: string | null;
  description?: string | null;
  category?: string | null;
  cec_hours?: number | null;
  lessons_total?: number;
  lessons_completed?: number;
}

interface EnrolledCourseListProps {
  enrollments: EnrollmentListItem[];
}

function enrolledLabel(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function EnrolledCourseList({ enrollments }: EnrolledCourseListProps) {
  if (enrollments.length === 0) {
    return null;
  }

  function certificateHref(enrollmentId: string) {
    return `/api/lms/enrollments/${enrollmentId}/certificate`;
  }

  return (
    <ul className="space-y-5">
      {enrollments.map((enr) => {
        const onboarding = isOnboardingCourse({ slug: enr.course_slug });
        const learnBase = getOnboardingLearnPath(enr.course_slug);
        const continueHref =
          enr.last_lesson_id != null
            ? getOnboardingLearnPath(enr.course_slug, enr.last_lesson_id)
            : learnBase;
        const hubHref = getOnboardingProgramPath(enr.course_slug);
        const done = enr.all_lessons_complete === true || enr.status === 'completed';
        const cecSubmitted = enr.cec_submission_status === 'sent';
        const completedLabel = formatLearnerActivity(enr.completed_at ?? enr.certificate_issued_at);
        const activityLabel = formatLearnerActivity(enr.last_activity_at ?? enr.enrolled_at);
        const startedOn = enrolledLabel(enr.enrolled_at);
        const pct = done ? 100 : Math.min(100, Math.max(0, Math.round(enr.completion_percentage)));
        const cecLabel = formatCecHoursForDisplay(enr.cec_hours);
        const lessonsTotal = enr.lessons_total && enr.lessons_total > 0 ? enr.lessons_total : null;
        const lessonsDone = enr.lessons_completed ?? 0;
        const primaryLabel = done
          ? 'View course'
          : enr.completion_percentage <= 0
            ? 'Start course'
            : 'Continue';

        return (
          <li key={enr.id} className={surface}>
            <div className="flex flex-col gap-0 lg:flex-row">
              <div className="shrink-0 overflow-hidden lg:w-56">
                <div className="aspect-[16/10] lg:h-full lg:min-h-[13rem]">
                  <CourseThumbnail compact src={enr.thumbnail_url} title={enr.course_title} />
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-5 sm:px-6">
                <div>
                  <p className={kicker}>
                    {cecLabel
                      ? 'IICRC CEC Accredited'
                      : onboarding
                        ? 'Organisation program'
                        : 'Professional development'}
                  </p>
                  <h3 className={`mt-2 text-[1.15rem] leading-snug sm:text-[1.25rem] ${heading}`}>
                    {enr.course_title}
                  </h3>
                  {enr.description ? (
                    <p className={`mt-2 line-clamp-2 text-[14px] leading-6 ${muted}`}>
                      {enr.description}
                    </p>
                  ) : null}
                  <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className={`${inset} rounded-xl px-3 py-3`}>
                      <dt className="text-[11px] text-slate-400">Progress</dt>
                      <dd className="mt-1 text-[1.15rem] font-semibold text-white tabular-nums">
                        {pct}%
                      </dd>
                    </div>
                    {lessonsTotal != null ? (
                      <div className={`${inset} rounded-xl px-3 py-3`}>
                        <dt className="text-[11px] text-slate-400">Lessons</dt>
                        <dd className="mt-1 text-[1.15rem] font-semibold text-white tabular-nums">
                          {done ? lessonsTotal : lessonsDone}
                          <span className="text-sm font-medium text-slate-400">
                            /{lessonsTotal}
                          </span>
                        </dd>
                      </div>
                    ) : null}
                    <div className={`${inset} rounded-xl px-3 py-3`}>
                      <dt className="text-[11px] text-slate-400">
                        {cecLabel ? 'Approved IICRC CEC' : 'CEC hours'}
                      </dt>
                      <dd className="mt-1 text-[1.15rem] font-semibold text-white">
                        {cecLabel ?? 'None'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-5">
                  <div
                    className={`mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px] ${muted}`}
                  >
                    <span>
                      {done
                        ? completedLabel
                          ? `Completed ${completedLabel}`
                          : 'Completed'
                        : `${pct}% complete`}
                    </span>
                    {enr.last_lesson_title && !done ? (
                      <span className="min-w-0 truncate text-white">
                        Next: {enr.last_lesson_title}
                      </span>
                    ) : null}
                  </div>
                  <div className="learner-home-bar h-2 overflow-hidden rounded-full bg-white/10">
                    <i
                      className="rounded-full bg-gradient-to-r from-sky-300 to-[#2490ed]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] ${muted}`}>
                    {enr.category ? <span>{enr.category}</span> : null}
                    {startedOn ? <span>Enrolled {startedOn}</span> : null}
                    {activityLabel && !done ? <span>Last activity {activityLabel}</span> : null}
                    {done ? (
                      <span>
                        Certificate {enr.certificate_issued_at ? 'available' : 'can be generated'}
                        {cecSubmitted ? ' · CEC submitted' : ''}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href={continueHref} className={btn}>
                      {primaryLabel}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                    {onboarding ? (
                      <Link href={hubHref} className={btnGhost}>
                        Program hub
                      </Link>
                    ) : null}
                    {done ? (
                      <>
                        <Link href="/dashboard/student/credentials" className={btnGhost}>
                          View certificate
                        </Link>
                        <a href={certificateHref(enr.id)} className={btnGhost} download>
                          Download
                        </a>
                      </>
                    ) : (
                      <Link
                        href={`/dashboard/courses/${encodeURIComponent(enr.course_slug)}`}
                        className={btnGhost}
                      >
                        Course details
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
