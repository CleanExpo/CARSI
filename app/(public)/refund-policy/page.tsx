import { Metadata } from 'next';
import Link from 'next/link';

import {
  LegalDocumentShell,
  marketingLegalH2,
  marketingLink,
  marketingTextStrong,
} from '@/components/marketing/LegalDocumentShell';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'Refund policy for CARSI course purchases and memberships, including your rights under the Australian Consumer Law.',
};

export default function RefundPolicyPage() {
  return (
    <LegalDocumentShell title="Refund Policy" updated="18 August 2026">
      <section>
        <h2 className={marketingLegalH2}>1. Your rights under the Australian Consumer Law</h2>
        <p>
          CARSI courses come with consumer guarantees that cannot be excluded under the Australian
          Consumer Law. Nothing in this policy limits those rights or replaces them.
        </p>
        <p>
          If a course has a <strong className={marketingTextStrong}>major problem</strong> — it is
          significantly different from its description, it is unfit for the purpose we said it was
          fit for, or it cannot be used at all — you may choose a refund or a replacement. If the
          problem is minor, we will fix it within a reasonable time; if we cannot, you may then
          choose a refund.
        </p>
        <p>
          These rights apply whether or not the time limits described in the rest of this policy
          have passed.
        </p>
      </section>

      <section>
        <h2 className={marketingLegalH2}>2. Individual course purchases</h2>
        <p>
          Most CARSI learners buy a single course outright. Because a course is delivered
          immediately and in full, our change-of-mind refund window depends on how much of it you
          have used.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className={marketingTextStrong}>Within 14 days, and under 20% complete:</strong>{' '}
            full refund on request, no reason needed.
          </li>
          <li>
            <strong className={marketingTextStrong}>
              After 14 days, or once you pass 20% of the course:
            </strong>{' '}
            change-of-mind refunds are not offered, because the material has been delivered. Your
            consumer guarantees in section 1 still apply in full.
          </li>
          <li>
            <strong className={marketingTextStrong}>Once a credential has been issued:</strong> the
            course is complete and change-of-mind refunds are not available. If a credential was
            issued in error, contact us and we will correct it.
          </li>
          <li>
            <strong className={marketingTextStrong}>Duplicate purchases</strong> of the same course
            are refunded in full whenever you tell us, regardless of progress.
          </li>
          <li>
            <strong className={marketingTextStrong}>Courses you cannot access</strong> because of a
            fault on our side are refunded in full if we cannot restore access promptly.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={marketingLegalH2}>3. Team and multi-seat purchases</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Unassigned seats are refundable in full within 30 days of purchase.</li>
          <li>
            Seats that have been assigned to a learner follow the individual course rules in
            section 2, assessed per learner.
          </li>
          <li>
            If your team size changes, contact us before requesting a refund — transferring a seat
            to another team member is usually faster and keeps the training record intact.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={marketingLegalH2}>4. Memberships</h2>
        <p>
          Annual membership is billed in advance. You may cancel at any time from your account
          settings; cancelling stops the next renewal and you keep access until the end of the
          period you have paid for.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            A renewal charged within the last 14 days is refundable in full if you have not started
            a new course in that period.
          </li>
          <li>Part-used periods are not otherwise refunded, subject always to section 1.</li>
        </ul>
      </section>

      <section>
        <h2 className={marketingLegalH2}>5. Continuing education credits</h2>
        <p>
          Continuing education credits are awarded by the issuing body, not by CARSI, and a refund
          may mean associated credits are withdrawn. We will tell you before processing a refund if
          that applies to your purchase.
        </p>
      </section>

      <section>
        <h2 className={marketingLegalH2}>6. How to request a refund</h2>
        <p>
          Email <span className={marketingTextStrong}>support@carsi.com.au</span> with the name on
          the account, the course, and the approximate purchase date. You do not need to give a
          reason for a change-of-mind request inside the window in section 2.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>We acknowledge refund requests within 2 business days.</li>
          <li>Approved refunds are returned to the original payment method.</li>
          <li>
            Your bank or card issuer usually takes a further 5 to 10 business days to show the
            money in your account.
          </li>
        </ul>
        <p>
          If you are not satisfied with our response, you can contact the consumer protection
          regulator in your state or territory, or the Australian Competition and Consumer
          Commission.
        </p>
      </section>

      <section>
        <h2 className={marketingLegalH2}>7. Related pages</h2>
        <p>
          This policy sits alongside our{' '}
          <Link href="/terms" className={marketingLink}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className={marketingLink}>
            Privacy Policy
          </Link>
          . For anything else, see{' '}
          <Link href="/support" className={marketingLink}>
            Support
          </Link>
          .
        </p>
      </section>
    </LegalDocumentShell>
  );
}
