import { notFound } from 'next/navigation';

import { CredentialVerificationPageContent } from '@/components/lms/CredentialVerificationPageContent';
import { getPublicCredentialJson } from '@/lib/server/credential-public';
import { getCourseSlugForEnrollment } from '@/lib/server/course-reviews';
import { getCecSubmissionSummaryForEnrollment } from '@/lib/server/iicrc-cec-submission';
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

  // The course comes from the enrolment itself, not only the `?course=` link, so a learner who
  // opens their credential later from the wallet sees the same review ask (spec D5).
  const courseSlug =
    (await getCourseSlugForEnrollment(credentialId)) ??
    (typeof query.course === 'string' && query.course.trim() ? query.course.trim() : null);

  const cecSubmission = await getCecSubmissionSummaryForEnrollment(credentialId);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12">
      <CredentialVerificationPageContent
        credential={credential}
        credentialId={credentialId}
        justCompleted={query.completed === '1'}
        courseSlug={courseSlug}
        showReviewAsk
        cecSubmissionStatus={cecSubmission?.status ?? null}
        cecSubmittedAt={cecSubmission?.sent_at ?? null}
      />
    </main>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ credentialId: string }> }) {
  const { credentialId } = await params;
  return {
    title: `Credential Verification — ${credentialId}`,
    description: 'Verify an IICRC CEC credential issued by CARSI',
    robots: 'index, follow',
  };
}
