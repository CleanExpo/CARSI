import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { facilityManagementProofPackHref } from '@/lib/marketing/industry-track2';

/** How a manager gets an employer training record without inventing a public dump. */
export function IndustryProofPack() {
  return (
    <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>What you can show a site</p>
        <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Employer proof-pack</h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          After a learner passes, they can download or share a training record from their
          credentials page. IICRC CEC hours appear only for courses the IICRC has approved.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          A manager cannot mint a pack for a crew that has not enrolled. Sign in as the learner, or
          ask them to share the record.
        </p>
        <Link
          href={facilityManagementProofPackHref}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white shadow-[0_14px_40px_-16px_rgba(20,111,194,0.55)] transition hover:bg-[#0f5fa8]"
        >
          Open learner credentials
        </Link>
      </div>
    </section>
  );
}
