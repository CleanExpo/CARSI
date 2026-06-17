'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Award, CheckCircle2, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CourseThumbnail } from '@/components/lms/CourseThumbnail';
import { ProgressBar } from '@/components/lms/ProgressBar';

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
  if (enrollments.length === 0) {
    return null;
  }

  const router = useRouter();

  function certificateHref(enrollmentId: string) {
    return `/api/lms/enrollments/${enrollmentId}/certificate`;
  }

  return (
    <ul className="space-y-4">
      {enrollments.map((enr) => {
        const learnBase = `/dashboard/learn/${encodeURIComponent(enr.course_slug)}`;
        const continueHref =
          enr.last_lesson_id != null
            ? `${learnBase}?lesson=${encodeURIComponent(enr.last_lesson_id)}`
            : learnBase;
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
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-200 hover:border-[#2490ed]/35 hover:bg-white/[0.07] hover:shadow-[0_20px_50px_-24px_rgba(36,144,237,0.35)]"
              style={{ cursor: 'pointer' }}
              role="link"
              tabIndex={0}
              aria-label={`Open course: ${enr.course_title}`}
              onClick={() => router.push(continueHref)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(continueHref);
                }
              }}
            >
              <CardContent className="p-0">
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:gap-8 sm:p-6">
                  <div className="shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 sm:w-52">
                    <CourseThumbnail compact src={enr.thumbnail_url} title={enr.course_title} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-[#c8e9ff]">
                        {enr.course_title}
                      </h3>
                      {done ? (
                        <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-white/15 text-white/60">
                          In progress
                        </Badge>
                      )}
                      {cecSubmitted ? (
                        <Badge className="gap-1 border-sky-500/35 bg-sky-500/10 text-sky-200">
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                          CEC submitted
                        </Badge>
                      ) : null}
                    </div>
                    {enr.last_lesson_title && !done ? (
                      <p className="text-xs text-white/45">
                        Last: <span className="text-white/70">{enr.last_lesson_title}</span>
                      </p>
                    ) : null}
                    {cecSubmitted && cecSubmittedAt ? (
                      <p className="text-xs text-sky-200/70">
                        IICRC submission sent {cecSubmittedAt}
                      </p>
                    ) : null}
                    <div className="max-w-md text-white/80">
                      <ProgressBar percentage={enr.completion_percentage} label="Progress" />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        asChild
                        className="gap-2 rounded-sm"
                        style={{ background: '#2490ed', color: '#fff' }}
                      >
                        <Link href={continueHref} onClick={(e) => e.stopPropagation()}>
                          <PlayCircle className="h-4 w-4" />
                          {done ? 'Review course' : 'Continue learning'}
                        </Link>
                      </Button>
                      {done ? (
                        <Button
                          asChild
                          variant="outline"
                          className="gap-2 rounded-sm border-amber-500/40 text-amber-200/90 hover:bg-amber-500/10"
                        >
                          <a
                            href={certificateHref(enr.id)}
                            download
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Award className="h-4 w-4" />
                            {enr.certificate_issued_at ? 'Download certificate' : 'Generate certificate'}
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
