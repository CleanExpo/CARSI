'use client';

import Link from 'next/link';
import { Award, Building2, Download, PartyPopper, Share2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { dash } from '@/lib/dashboard-light-ui';
import { ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';
import { cn } from '@/lib/utils';

type Props = {
  courseTitle: string;
  enrollmentId: string;
  courseSlug?: string;
  onShare?: () => void;
  variant?: 'default' | 'enterprise';
};

/**
 * Shown when every lesson in the course curriculum is marked complete.
 */
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

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border px-5 py-6 sm:px-8 sm:py-8',
        enterprise
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-[#eef7ff]'
          : 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 via-[#2490ed]/10 to-transparent'
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl',
          enterprise ? 'bg-emerald-200/40' : 'bg-emerald-400/20'
        )}
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 space-y-2">
          {enterprise ? (
            <p className={dash.eyebrow}>{ONBOARDING_BRAND}</p>
          ) : null}
          <p
            className={cn(
              'flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl',
              enterprise ? 'text-slate-900' : 'text-white'
            )}
          >
            <span className="inline-flex items-center gap-1.5" aria-hidden>
              <PartyPopper className={cn('h-6 w-6', enterprise ? 'text-amber-500' : 'text-amber-300')} />
              <Sparkles className={cn('h-5 w-5', enterprise ? 'text-[#2490ed]' : 'text-[#7ec5ff]')} />
            </span>
            <span>
              {enterprise
                ? 'Program complete — credential earned'
                : 'Congratulations — you finished the course!'}
            </span>
          </p>
          <p
            className={cn(
              'text-sm leading-relaxed',
              enterprise ? 'text-slate-600' : 'text-white/70'
            )}
          >
            <span className={cn('font-medium', enterprise ? 'text-slate-900' : 'text-white/90')}>
              {courseTitle.replace(`${ONBOARDING_BRAND} — `, '')}
            </span>
            {enterprise
              ? ' — you have met the operational readiness standards for this program. Download your certificate for your records and supervisor sign-off.'
              : ' — every module and lesson is complete. You can download your certificate as a PDF and find it anytime under My credentials.'}
          </p>
          {enterprise ? (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Building2 className="h-3.5 w-3.5 text-[#146fc2]" aria-hidden />
              Share this achievement with your organisation or facility manager.
            </p>
          ) : (
            <p className="text-xs text-white/45">
              Nice work — share your achievement or keep learning in the catalogue.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[200px]">
          {onShare ? (
            <Button
              type="button"
              variant="outline"
              onClick={onShare}
              className={cn(
                'w-full sm:w-auto',
                enterprise
                  ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'border-[#2490ed]/30 bg-[#2490ed]/10 text-[#7ec5ff] hover:bg-[#2490ed]/20'
              )}
            >
              <Share2 className="mr-2 h-4 w-4" aria-hidden />
              Share progress
            </Button>
          ) : null}
          <Button
            asChild
            className="w-full rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 sm:w-auto"
          >
            <Link href={certViewHref}>
              <Award className="mr-2 h-4 w-4" aria-hidden />
              {enterprise ? 'View credential' : 'View certificate'}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className={cn(
              'w-full sm:w-auto',
              enterprise
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
            )}
          >
            <a href={pdfHref} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Download PDF
            </a>
          </Button>
          {enterprise ? (
            <Button
              asChild
              variant="outline"
              className="w-full border-[#2490ed]/25 bg-[#eef7ff]/50 text-[#146fc2] hover:bg-[#eef7ff] sm:w-auto"
            >
              <Link href={hubHref}>Return to program hub</Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
            >
              <Link href="/dashboard/student/credentials" className="inline-flex items-center justify-center">
                <Award className="mr-2 h-4 w-4 text-[#7ec5ff]" aria-hidden />
                Open My credentials
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
