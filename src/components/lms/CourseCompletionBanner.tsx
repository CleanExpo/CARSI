'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Award, Building2, Download, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';
import { ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';
import { cn } from '@/lib/utils';
import type { RenewalCourseSuggestion } from '@/types/renewal';

type EnrollmentHint = {
  id: string;
  course_slug: string;
  cec_submission_status?: string | null;
};

type Props = {
  courseTitle: string;
  enrollmentId: string;
  courseSlug?: string;
  onShare?: () => void;
  variant?: 'default' | 'enterprise';
};

export function CourseCompletionBanner({
  courseTitle,
  enrollmentId,
  courseSlug,
  onShare,
  variant = 'default',
}: Props) {
  const enterprise = variant === 'enterprise';
  const certViewHref = `/dashboard/credentials/${encodeURIComponent(enrollmentId)}${
    courseSlug ? `?completed=1&course=${encodeURIComponent(courseSlug)}` : '?completed=1'
  }`;
  const pdfHref = `/api/lms/enrollments/${encodeURIComponent(enrollmentId)}/certificate`;
  const hubHref = courseSlug ? `/dashboard/onboarding/${courseSlug}` : '/dashboard/onboarding';
  const [cecSubmitted, setCecSubmitted] = useState(false);
  const [nextCourse, setNextCourse] = useState<RenewalCourseSuggestion | null>(null);

  useEffect(() => {
    if (enterprise) return;
    let cancelled = false;
    void Promise.all([
      apiClient.get<EnrollmentHint[]>('/api/lms/enrollments/me').catch(() => [] as EnrollmentHint[]),
      apiClient
        .get<RenewalCourseSuggestion[]>('/api/lms/recommendations/next-course')
        .catch(() => [] as RenewalCourseSuggestion[]),
    ]).then(([enrollments, recs]) => {
      if (cancelled) return;
      const row = enrollments.find((e) => e.id === enrollmentId);
      setCecSubmitted(row?.cec_submission_status === 'sent');
      const next = recs.find((c) => c.slug !== courseSlug) ?? recs[0] ?? null;
      setNextCourse(next);
    });
    return () => {
      cancelled = true;
    };
  }, [enterprise, enrollmentId, courseSlug]);

  if (enterprise) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-white px-5 py-6 sm:px-8"
        role="status"
        aria-live="polite"
      >
        <p className={dash.eyebrow}>{ONBOARDING_BRAND}</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">Program complete</p>
        <p className="mt-2 text-sm text-slate-600">
          {courseTitle.replace(`${ONBOARDING_BRAND} — `, '')} is complete. Download your certificate
          for records and supervisor sign-off.
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5 text-[#146fc2]" aria-hidden />
          Share this with your organisation if required.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {onShare ? (
            <Button type="button" variant="outline" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" aria-hidden />
              Share progress
            </Button>
          ) : null}
          <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-500">
            <Link href={certViewHref}>
              <Award className="mr-2 h-4 w-4" aria-hidden />
              View credential
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={pdfHref} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Download PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={hubHref}>Return to program hub</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-6 sm:px-8" role="status" aria-live="polite">
      <p className={dash.eyebrow}>Course completed</p>
      <h2 className={`mt-2 ${dash.h2}`}>{courseTitle}</h2>
      <ul className="mt-4 space-y-1 text-sm text-slate-600">
        <li>Course completed</li>
        <li>Assessment passed</li>
        <li>{cecSubmitted ? 'CEC submitted' : 'Certificate available'}</li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={certViewHref} className={dash.btnPrimary}>
          View certificate
        </Link>
        <a href={pdfHref} className={dash.btnSecondary}>
          Download
        </a>
        {nextCourse ? (
          <Link
            href={`/dashboard/courses/${encodeURIComponent(nextCourse.slug)}`}
            className={dash.btnSecondary}
          >
            Find your next course
          </Link>
        ) : (
          <Link href="/dashboard/courses" className={dash.btnSecondary}>
            Find your next course
          </Link>
        )}
        {onShare ? (
          <button type="button" onClick={onShare} className={dash.btnGhost}>
            Share progress
          </button>
        ) : null}
      </div>
      {nextCourse ? (
        <p className={cn('mt-4 text-sm', dash.muted)}>
          Recommended next: {nextCourse.title}
        </p>
      ) : null}
    </div>
  );
}
