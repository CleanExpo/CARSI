import { Metadata } from 'next';
import Link from 'next/link';

import {
  LegalDocumentShell,
  marketingLegalH2,
  marketingLink,
  marketingTextStrong,
} from '@/components/marketing/LegalDocumentShell';

export const metadata: Metadata = {
  title: 'Support',
  description:
    'How to get help with a CARSI course, your account, a credential, an invoice or a refund.',
};

export default function SupportPage() {
  return (
    <LegalDocumentShell title="Support" updated="18 August 2026">
      <section>
        <h2 className={marketingLegalH2}>Contact us</h2>
        <p>
          Email <span className={marketingTextStrong}>support@carsi.com.au</span> and we will
          reply within 2 business days. CARSI operates on Australian Eastern time.
        </p>
        <p>
          You can also use the{' '}
          <Link href="/contact" className={marketingLink}>
            contact form
          </Link>
          , or ask Margot, our online assistant, at the bottom-right of any page.
        </p>
      </section>

      <section>
        <h2 className={marketingLegalH2}>Course access and progress</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            A course you bought is not showing: sign in and check{' '}
            <Link href="/dashboard/courses" className={marketingLink}>
              your courses
            </Link>
            . Purchases attach to the email used at checkout, so a second email address is the
            usual cause.
          </li>
          <li>
            Progress did not save: progress records when a lesson is marked complete. Re-open the
            lesson and complete it again; tell us if it still does not stick.
          </li>
          <li>
            Video will not play: try another browser or network first, as most playback problems
            are local. If it persists, send us the course and lesson name.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={marketingLegalH2}>Credentials</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Every completed course issues a CARSI credential with a public verification page at
            <span className={marketingTextStrong}> /verify/credential/&#123;id&#125;</span>, which
            anyone can open without signing in.
          </li>
          <li>
            An employer or client can verify a credential from that link alone — they do not need
            a CARSI account.
          </li>
          <li>
            Name spelled incorrectly on a credential: email us and we will reissue it. Send the
            correct spelling exactly as it should appear.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={marketingLegalH2}>Continuing education credits</h2>
        <p>
          CARSI is an IICRC CEC Accredited provider and issues its own CARSI Southern Hemisphere
          Restoration Designations. IICRC certification itself is obtained through an
          IICRC-approved school and examination, not through CARSI.
        </p>
        <p>
          Continuing education credits apply only to courses the IICRC has individually approved.
          If you are taking a course specifically to maintain a certification you already hold,
          email us before you enrol and we will confirm the current position for that course.
        </p>
      </section>

      <section>
        <h2 className={marketingLegalH2}>Billing, invoices and refunds</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Tax invoices are emailed at purchase. Ask us if you need one reissued or addressed to
            a company name.
          </li>
          <li>
            Refunds are covered by our{' '}
            <Link href="/refund-policy" className={marketingLink}>
              Refund Policy
            </Link>
            , which sits alongside your rights under the Australian Consumer Law.
          </li>
          <li>
            Buying for a team: contact us for seat pricing rather than buying courses one at a
            time, so the training records stay together.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={marketingLegalH2}>Accounts</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Forgotten password: use the reset link on the sign-in page.</li>
          <li>
            Changing the email on an account: email us from the current address so we can confirm
            it is you.
          </li>
          <li>
            Closing an account or requesting your data: see the{' '}
            <Link href="/privacy" className={marketingLink}>
              Privacy Policy
            </Link>
            .
          </li>
        </ul>
      </section>
    </LegalDocumentShell>
  );
}
