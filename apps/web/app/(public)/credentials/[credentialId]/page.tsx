import { CredentialVerificationCard } from '@/components/lms/CredentialVerificationCard';
import { notFound } from 'next/navigation';

async function getCredential(credentialId: string) {
  const apiUrl = process.env.API_URL ?? 'http://localhost:8000';
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

  return (
    <main className="container mx-auto px-4 py-16">
      <CredentialVerificationCard credential={credential} />
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
