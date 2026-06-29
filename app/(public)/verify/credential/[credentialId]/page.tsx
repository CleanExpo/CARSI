import { notFound } from 'next/navigation';

import { CredentialVerificationPageContent } from '@/components/lms/CredentialVerificationPageContent';
import { getPublicCredentialJson } from '@/lib/server/credential-public';
import { getServerOrigin } from '@/lib/server/request-origin';

export const dynamic = 'force-dynamic';

export default async function PublicCredentialVerifyPage({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}) {
  const { credentialId } = await params;
  const origin = await getServerOrigin();
  const credential = await getPublicCredentialJson(credentialId, origin);
  if (!credential) notFound();

  return (
    <main className="relative z-10 mx-auto min-h-[60vh] w-full max-w-4xl px-6 py-16">
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Public verification
      </p>
      <h1 className="mb-8 text-3xl font-bold text-slate-950">Training credential</h1>
      <CredentialVerificationPageContent credential={credential} credentialId={credentialId} />
    </main>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ credentialId: string }> }) {
  const { credentialId } = await params;
  return {
    title: `Verify credential ${credentialId.slice(0, 8)}… | CARSI`,
    description: 'Employer verification for CARSI IICRC-aligned CEC courses credentials',
    robots: 'index, follow',
  };
}
