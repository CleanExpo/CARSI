import { redirect } from 'next/navigation';

/**
 * Legacy public URL — forwards to the PUBLIC credential verification page.
 *
 * This used to redirect to `/dashboard/credentials/…`, which is behind auth. A
 * credential link is something a learner sends to an employer to prove a CARSI
 * designation, and the employer has no CARSI account — so the chain resolved
 * `/credentials/<id>` -> `/dashboard/credentials/<id>` -> `/login` and the
 * credential could not be verified by the one person it exists to convince.
 * Measured on production 2026-08-16.
 *
 * `/verify/credential/<id>` is the public surface and needs no session, so this
 * is a redirect-target fix. Nothing about who may read a credential changes.
 */
export default async function LegacyCredentialRedirect({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}) {
  const { credentialId } = await params;
  redirect(`/verify/credential/${credentialId}`);
}
