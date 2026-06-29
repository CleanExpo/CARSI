'use client';

import { CourseThumbnail } from '@/components/lms/CourseThumbnail';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { dash } from '@/lib/dashboard-light-ui';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { getOnboardingLearnPath, getOnboardingProgramPath } from '@/lib/onboarding/navigation';
import { Award, Building2, CheckCircle2, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  all_lessons_complete?: boolean;
  certificate_issued_at?: string | null;
  cec_submission_status?: string | null;
  cec_submitted_at?: string | null;
}

interface EnrolledCourseListProps {
  enrollments: EnrollmentListItem[];
}

export function EnrolledCourseList({ enrollments }: EnrolledCourseListProps) {
  const router = useRouter();

  if (enrollments.length === 0) {
    return null;
  }

  function certificateHref(enrollmentId: string) {
    return `/api/lms/enrollments/${enrollmentId}/certificate`;
  }

  return (
    <ul className="space-y-4">
      {enrollments.map((enr) => {
        const onboarding = isOnboardingCourse({ slug: enr.course_slug });
        const learnBase = getOnboardingLearnPath(enr.course_slug);
        const continueHref =
          enr.last_lesson_id != null
            ? getOnboardingLearnPath(enr.course_slug, enr.last_lesson_id)
            : learnBase;
        const hubHref = getOnboardingProgramPath(enr.course_slug);
        const openHref = onboarding ? hubHref : continueHref;
        const done = enr.all_lessons_complete === true || enr.status === 'completed';
        const cecSubmitted = enr.cec_submission_status === 'sent';
        const cecSubmittedAt = enr.cec_submitted_at
          ? new Date(enr.cec_submitted_at).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : null;

        return (
          <li key={enr.id}>
            <Card
              className={dash.enrollmentCard}
              style={{ cursor: 'pointer' }}
              role="link"
              tabIndex={0}
              aria-label={`Open course: ${enr.course_title}`}
              onClick={() => router.push(openHref)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(openHref);
                }
              }}
            >
              <CardContent className="p-0">
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:gap-8 sm:p-6">
                  <div className="shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200 sm:w-52">
                    <CourseThumbnail compact src={enr.thumbnail_url} title={enr.course_title} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-[#146fc2]">
                        {enr.course_title}
                      </h3>
                      {done ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-200 text-slate-600">
                          In progress
                        </Badge>
                      )}
                      {onboarding ? (
                        <Badge className="gap-1 border-[#2490ed]/25 bg-[#eef7ff] text-[#146fc2]">
                          <Building2 className="h-3 w-3" aria-hidden />
                          Organisation program
                        </Badge>
                      ) : null}
                      {cecSubmitted ? (
                        <Badge className="gap-1 border-sky-200 bg-sky-50 text-sky-800">
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                          CEC submitted
                        </Badge>
                      ) : null}
                    </div>
                    {enr.last_lesson_title && !done ? (
                      <p className="text-xs text-slate-500">
                        Last: <span className="text-slate-700">{enr.last_lesson_title}</span>
                      </p>
                    ) : null}
                    {cecSubmitted && cecSubmittedAt ? (
                      <p className="text-xs text-sky-700">IICRC submission sent {cecSubmittedAt}</p>
                    ) : null}
                    <div className="max-w-md text-slate-800">
                      <ProgressBar percentage={enr.completion_percentage} label="Progress" />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button asChild className="gap-2 rounded-lg bg-[#146fc2] text-white hover:bg-[#0f5fa8]">
                        <Link href={continueHref} onClick={(e) => e.stopPropagation()}>
                          <PlayCircle className="h-4 w-4" />
                          {done ? 'Review lessons' : onboarding ? 'Continue lesson' : 'Continue learning'}
                        </Link>
                      </Button>
                      {onboarding ? (
                        <Button
                          asChild
                          variant="outline"
                          className="gap-2 rounded-lg border-[#2490ed]/25 text-[#146fc2] hover:bg-[#eef7ff]"
                        >
                          <Link href={hubHref} onClick={(e) => e.stopPropagation()}>
                            <Building2 className="h-4 w-4" />
                            Program hub
                          </Link>
                        </Button>
                      ) : null}
                      {done ? (
                        <Button
                          asChild
                          variant="outline"
                          className="gap-2 rounded-lg border-amber-200 text-amber-800 hover:bg-amber-50"
                        >
                          <a
                            href={certificateHref(enr.id)}
                            download
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Award className="h-4 w-4" />
                            {enr.certificate_issued_at
                              ? 'Download certificate'
                              : 'Generate certificate'}
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
