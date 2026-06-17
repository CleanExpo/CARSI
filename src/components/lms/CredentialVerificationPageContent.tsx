import Link from 'next/link';
import { Award, CheckCircle2, Download, PartyPopper } from 'lucide-react';

import { CertificatePreview } from '@/components/lms/diagrams/CertificatePreview';
import type { PublicCredentialJson } from '@/lib/server/credential-public';

type Props = {
  credential: PublicCredentialJson;
  credentialId: string;
  /** Set when redirected immediately after finishing the course. */
  justCompleted?: boolean;
  courseSlug?: string | null;
  cecSubmissionStatus?: string | null;
  cecSubmittedAt?: string | null;
};

export function CredentialVerificationPageContent({
  credential,
  credentialId,
  justCompleted = false,
  courseSlug,
  cecSubmissionStatus = null,
  cecSubmittedAt = null,
}: Props) {
  const pdfUrl = `/api/lms/credentials/${encodeURIComponent(credentialId)}?pdf=1`;
  const cecSubmitted = cecSubmissionStatus === 'sent';
  const cecSubmittedLabel = cecSubmittedAt
    ? new Date(cecSubmittedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="w-full max-w-6xl">
      {justCompleted ? (
        <div
          className="mt-6 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 via-[#2490ed]/10 to-transparent px-5 py-5 sm:px-7"
          role="status"
        >
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
            <PartyPopper className="h-5 w-5 text-amber-300" aria-hidden />
            Course complete!
          </p>
          <p className="mt-2 text-sm text-white/70">
            You finished <span className="font-medium text-white/90">{credential.course_title}</span>.
            View your certificate below or download the PDF.
          </p>
        </div>
      ) : null}

      {cecSubmitted ? (
        <div
          className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-5 py-4"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" aria-hidden />
          <div>
            <p className="font-medium text-sky-100">CEC submitted to IICRC</p>
            <p className="mt-1 text-sm text-sky-100/75">
              Your certificate was emailed to IICRC Renewals
              {cecSubmittedLabel ? ` on ${cecSubmittedLabel}` : ''}. Keep this page as your
              verification record.
            </p>
          </div>
        </div>
      ) : null}

      <header className="mt-8 text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2490ed]/80 uppercase">
          Certificate
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{credential.course_title}</h1>
        <p className="mt-1 text-sm text-white/50">{credential.student_name}</p>
      </header>

      <section className="mt-10">
        <h2
          className="mb-4 text-center text-lg font-semibold"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          Certificate Preview
        </h2>
        <CertificatePreview
          studentName={credential.student_name ?? undefined}
          courseName={credential.course_title ?? undefined}
          discipline={credential.discipline ?? credential.iicrc_discipline ?? undefined}
          credentialId={credentialId}
          cecHours={credential.cec_hours}
          completedDate={
            credential.completed_at
              ? new Date(credential.completed_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : undefined
          }
          issuedDate={
            credential.issued_date
              ? new Date(credential.issued_date).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : undefined
          }
        />
      </section>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download certificate (PDF)
        </a>
        <Link
          href="/dashboard/student/credentials"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
        >
          <Award className="h-4 w-4 text-[#7ec5ff]" aria-hidden />
          All credentials
        </Link>
        {courseSlug ? (
          <Link
            href={`/dashboard/learn/${encodeURIComponent(courseSlug)}`}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-6 py-3 text-sm text-white/60 transition-colors hover:text-white"
          >
            Back to course
          </Link>
        ) : null}
      </div>
    </div>
  );
}
