import { Metadata } from 'next';

import { LegalDocumentShell } from '@/components/marketing/LegalDocumentShell';
import { ReviewPolicyBody } from '@/components/lms/ReviewPolicy';
import { REVIEW_POLICY_COPY } from '@/lib/reviews/review-policy';

export const metadata: Metadata = {
  title: REVIEW_POLICY_COPY.title,
  description: 'How CARSI asks for, publishes, hides and counts course reviews.',
};

export default function ReviewPolicyPage() {
  return (
    <LegalDocumentShell title={REVIEW_POLICY_COPY.title} updated="18 October 2026">
      <section>
        <ReviewPolicyBody />
      </section>
    </LegalDocumentShell>
  );
}
