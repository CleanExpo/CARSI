import { Metadata } from 'next';

import { LegalDocumentShell } from '@/components/marketing/LegalDocumentShell';
import { ReviewPolicyBody } from '@/components/lms/ReviewPolicy';
import { REVIEW_POLICY_COPY, reviewAuditStartSentence } from '@/lib/reviews/review-policy';
import { getReviewModerationRecordingStart } from '@/lib/server/course-reviews';

export const metadata: Metadata = {
  title: REVIEW_POLICY_COPY.title,
  description: 'How CARSI asks for, publishes, hides and counts course reviews.',
};

// The recording start date comes from the database, so render per request.
export const dynamic = 'force-dynamic';

export default async function ReviewPolicyPage() {
  const startSentence = reviewAuditStartSentence(await getReviewModerationRecordingStart());
  return (
    <LegalDocumentShell title={REVIEW_POLICY_COPY.title} updated="18 October 2026">
      <section>
        <ReviewPolicyBody />
        {startSentence ? <p className="mt-2 text-sm leading-relaxed text-slate-700">{startSentence}</p> : null}
      </section>
    </LegalDocumentShell>
  );
}
