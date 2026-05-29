import { notFound } from 'next/navigation';

import { CredentialVerificationPageContent } from '@/components/lms/CredentialVerificationPageContent';
import { getPublicCredentialJson } from '@/lib/server/credential-public';
import { getServerOrigin } from '@/lib/server/request-origin';

export const dynamic = 'force-dynamic';

export default async function DashboardCredentialPage({
  params,
  searchParams,
}: {
  params: Promise<{ credentialId: string }>;
  searchParams: Promise<{ completed?: string; course?: string }>;
}) {
  const { credentialId } = await params;
  const query = await searchParams;
  const origin = await getServerOrigin();
  const credential = await getPublicCredentialJson(credentialId, origin);
  if (!credential) notFound();

  const courseSlug =
    typeof query.course === 'string' && query.course.trim() ? query.course.trim() : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-12">
      <CredentialVerificationPageContent
        credential={credential}
        credentialId={credentialId}
        justCompleted={query.completed === '1'}
        courseSlug={courseSlug}
      />
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
