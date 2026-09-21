'use client';

import { CourseThumbnail } from '@/components/lms/CourseThumbnail';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { dash } from '@/lib/dashboard-light-ui';
import { formatLearnerActivity } from '@/lib/learner-course-cta';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { getOnboardingLearnPath, getOnboardingProgramPath } from '@/lib/onboarding/navigation';
import Link from 'next/link';

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
}

interface EnrolledCourseListProps {
  enrollments: EnrollmentListItem[];
}

export function EnrolledCourseList({ enrollments }: EnrolledCourseListProps) {
  if (enrollments.length === 0) {
    return null;
  }

  function certificateHref(enrollmentId: string) {
    return `/api/lms/enrollments/${enrollmentId}/certificate`;
  }

  return (
    <ul className="space-y-3">
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
        const primaryLabel = done
          ? 'View course'
          : enr.completion_percentage <= 0
            ? 'Start course'
            : 'Continue';

        return (
          <li key={enr.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
              <div className="shrink-0 overflow-hidden rounded-lg sm:w-44">
                <CourseThumbnail compact src={enr.thumbnail_url} title={enr.course_title} />
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <h3 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                  {enr.course_title}
                </h3>
                {!done ? (
                  <>
                    <p className="text-sm tabular-nums text-slate-600">
                      {enr.completion_percentage}% complete
                    </p>
                    <div className="max-w-md">
                      <ProgressBar percentage={enr.completion_percentage} label="Progress" />
                    </div>
                    {enr.last_lesson_title ? (
                      <p className="text-sm text-slate-500">
                        Next: <span className="text-slate-800">{enr.last_lesson_title}</span>
                      </p>
                    ) : null}
                    {activityLabel ? (
                      <p className="text-sm text-slate-500">
                        Last activity: <span className="text-slate-800">{activityLabel}</span>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    {completedLabel ? (
                      <p className="text-sm text-slate-500">Completed {completedLabel}</p>
                    ) : null}
                    <p className="text-sm text-slate-500">
                      Certificate:{' '}
                      {enr.certificate_issued_at ? 'Available' : 'Can be generated'}
                    </p>
                    <p className="text-sm text-slate-500">
                      CEC: {cecSubmitted ? 'Submitted' : 'Not submitted'}
                    </p>
                  </>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={continueHref} className={dash.btnPrimary}>
                    {primaryLabel}
                  </Link>
                  {onboarding ? (
                    <Link href={hubHref} className={dash.btnSecondary}>
                      Program hub
                    </Link>
                  ) : null}
                  {done ? (
                    <>
                      <Link href="/dashboard/student/credentials" className={dash.btnSecondary}>
                        View certificate
                      </Link>
                      <a href={certificateHref(enr.id)} className={dash.btnGhost} download>
                        Download certificate
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
