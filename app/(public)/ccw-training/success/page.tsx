import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { getCheckoutSession } from '@/lib/api/stripe';
import { carsiCoachingPortalPath } from '@/lib/marketing/carsi-coaching-program';
import {
  carsiCoachingMonthlyPath,
  carsiCoachingProductName,
} from '@/lib/marketing/carsi-coaching-monthly';
import { processCarsiCoachingMonthlyCheckoutCompleted } from '@/lib/server/carsi-coaching-monthly-fulfillment';

export const metadata = {
  title: `${carsiCoachingProductName} — welcome`,
  robots: { index: false },
};

async function fulfillIfNeeded(sessionId: string | undefined) {
  if (!sessionId || !process.env.STRIPE_SECRET_KEY?.trim()) return;
  try {
    const session = await getCheckoutSession(sessionId);
    await processCarsiCoachingMonthlyCheckoutCompleted(session);
  } catch (err) {
    console.error('[ccw-training/success] coaching fulfillment', err);
  }
}

export default async function CarsiCoachingMonthlySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  await fulfillIfNeeded(sessionId);

  return (
    <div className="border-b border-slate-200/70 bg-[#fafbfc] py-20">
      <div className={`${PUBLIC_SHELL_INNER_CLASS} mx-auto max-w-xl text-center`}>
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden />
        <h1 className={`mt-6 ${LANDING_DISPLAY_H2_CLASS}`}>You&apos;re in — welcome to coaching</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Payment succeeded. A confirmation email is on its way with next steps. Phill will follow
          up with onboarding, your LMS track, and your first monthly planning session.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={carsiCoachingPortalPath}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#146fc2] px-6 text-sm font-semibold text-white"
          >
            Open coaching portal
          </Link>
          <Link
            href={carsiCoachingMonthlyPath}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700"
          >
            Back to coaching page
          </Link>
        </div>
      </div>
    </div>
  );
}
