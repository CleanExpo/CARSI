import Link from 'next/link';

import { CredentialVerificationCard } from '@/components/lms/CredentialVerificationCard';
import { CertificatePreview } from '@/components/lms/diagrams/CertificatePreview';
import type { PublicCredentialJson } from '@/lib/server/credential-public';

type Props = {
  credential: PublicCredentialJson;
  credentialId: string;
};

export function CredentialVerificationPageContent({ credential, credentialId }: Props) {
  const pdfUrl = `/api/lms/credentials/${encodeURIComponent(credentialId)}?pdf=1`;

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <Link
          href="/dashboard/student/credentials"
          className="text-sm font-medium text-[#7ec5ff] transition-colors hover:text-[#9ed4ff]"
        >
          ← My credentials
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-white/50 transition-colors hover:text-white/80"
        >
          Dashboard home
        </Link>
      </div>

      <CredentialVerificationCard credential={credential} />

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
          completedDate={
            credential.completed_at
              ? new Date(credential.completed_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : undefined
          }
        />
      </section>

      <div className="mt-6 text-center">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-sm border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Download Certificate (PDF)
        </a>
      </div>
    </div>
  );
}
