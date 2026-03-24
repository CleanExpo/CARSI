import { CredentialVerificationCard } from '@/components/lms/CredentialVerificationCard';
import { CertificatePreview } from '@/components/lms/diagrams/CertificatePreview';
import { notFound } from 'next/navigation';
import { getBackendOrigin } from '@/lib/env/public-url';

export const dynamic = 'force-dynamic';

async function getCredential(credentialId: string) {
  const apiUrl = getBackendOrigin();
  const res = await fetch(`${apiUrl}/api/lms/credentials/${credentialId}`, {
    cache: 'no-store', // Always fresh — credentials can be revoked
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch credential');
  return res.json();
}

export default async function CredentialPage({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}) {
  const { credentialId } = await params;
  const credential = await getCredential(credentialId);
  if (!credential) notFound();

  const backendUrl = getBackendOrigin();
  const pdfUrl = `${backendUrl}/api/lms/credentials/${credentialId}/pdf`;

  return (
    <main className="container mx-auto px-4 py-16">
      <CredentialVerificationCard credential={credential} />

      {/* Certificate visual preview */}
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
          discipline={credential.discipline ?? undefined}
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
    </main>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ credentialId: string }> }) {
  const { credentialId } = await params;
  return {
    title: `Credential Verification — ${credentialId} | CARSI`,
    description: 'Verify an IICRC CEC credential issued by CARSI',
    robots: 'index, follow',
  };
}
