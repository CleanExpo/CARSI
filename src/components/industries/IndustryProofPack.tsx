import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
} from '@/components/landing/public-shell-width';
import { facilityManagementProofPackHref } from '@/lib/marketing/industry-track2';
import { marketingBtnPrimary, marketingTextMuted } from '@/lib/marketing/marketing-ui';

/** How a manager gets an employer training record without inventing a public dump. */
export function IndustryProofPack() {
  return (
    <section className="py-16 md:py-24">
      <div className="rounded-[2rem] border border-slate-200 bg-white px-5 py-8 sm:px-8 sm:py-10">
        <p className={LANDING_EYEBROW_CLASS}>What you can show a site</p>
        <h2 className={`mt-4 ${LANDING_DISPLAY_H2_CLASS}`}>Employer proof-pack</h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          After a learner passes, they can download or share a training record from their
          credentials page. IICRC CEC hours appear only for courses the IICRC has approved.
        </p>
        <p className={`mt-3 max-w-2xl text-sm ${marketingTextMuted}`}>
          A manager cannot mint a pack for a crew that has not enrolled. Sign in as the learner,
          or ask them to share the record.
        </p>
        <Link href={facilityManagementProofPackHref} className={`mt-6 ${marketingBtnPrimary}`}>
          Open learner credentials
        </Link>
      </div>
    </section>
  );
}
