import { notFound } from 'next/navigation';

import { CredentialVerificationPageContent } from '@/components/lms/CredentialVerificationPageContent';
import { getPublicCredentialJson } from '@/lib/server/credential-public';
import { getServerOrigin } from '@/lib/server/request-origin';

export const dynamic = 'force-dynamic';

export default async function DashboardCredentialPage({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}) {
  const { credentialId } = await params;
  const origin = await getServerOrigin();
  const credential = await getPublicCredentialJson(credentialId, origin);
  if (!credential) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl">
      <CredentialVerificationPageContent credential={credential} credentialId={credentialId} />
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
