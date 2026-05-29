'use client';

import Link from 'next/link';
import { Award, Download, PartyPopper, Share2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

type Props = {
  courseTitle: string;
  enrollmentId: string;
  courseSlug?: string;
  onShare?: () => void;
};

/**
 * Shown when every lesson in the course curriculum is marked complete.
 */
export function CourseCompletionBanner({
  courseTitle,
  enrollmentId,
  courseSlug,
  onShare,
}: Props) {
  const certViewHref = `/dashboard/credentials/${encodeURIComponent(enrollmentId)}${
    courseSlug ? `?course=${encodeURIComponent(courseSlug)}` : ''
  }`;
  const pdfHref = `/api/lms/enrollments/${encodeURIComponent(enrollmentId)}/certificate`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 via-[#2490ed]/10 to-transparent px-5 py-6 sm:px-8 sm:py-8"
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 space-y-2">
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
            <span className="inline-flex items-center gap-1.5" aria-hidden>
              <PartyPopper className="h-6 w-6 text-amber-300" />
              <Sparkles className="h-5 w-5 text-[#7ec5ff]" />
            </span>
            <span>Congratulations — you finished the course!</span>
            <span className="text-2xl" aria-hidden>
              🎉
            </span>
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            <span className="font-medium text-white/90">{courseTitle}</span> — every module and
            lesson is complete. You can download your certificate as a PDF and find it anytime under{' '}
            <strong className="font-semibold text-white/95">My credentials</strong>.
          </p>
          <p className="text-xs text-white/45">
            🏆 Nice work — share your achievement or keep learning in the catalogue.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[200px]">
          {onShare ? (
            <Button
              type="button"
              variant="outline"
              onClick={onShare}
              className="w-full border-[#2490ed]/30 bg-[#2490ed]/10 text-[#7ec5ff] hover:bg-[#2490ed]/20 sm:w-auto"
            >
              <Share2 className="mr-2 h-4 w-4" aria-hidden />
              Share progress
            </Button>
          ) : null}
          <Button asChild className="w-full rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 sm:w-auto">
            <Link href={certViewHref}>
              <Award className="mr-2 h-4 w-4" aria-hidden />
              View certificate
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
          >
            <a href={pdfHref} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Download PDF
            </a>
          </Button>
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
        </div>
      </div>
    </div>
  );
}
