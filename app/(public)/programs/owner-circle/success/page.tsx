import { CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { getCheckoutSession } from '@/lib/api/stripe';
import { businessCoachingPath } from '@/lib/marketing/business-coaching';
import {
  marketingBtnPrimary,
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';
import { processBusinessCoachingCheckoutCompleted } from '@/lib/server/business-coaching-fulfillment';

export const metadata: Metadata = {
  title: 'Owner Circle booking confirmed',
  robots: { index: false, follow: false },
};

async function fulfillIfNeeded(sessionId: string | undefined) {
  if (!sessionId || !process.env.STRIPE_SECRET_KEY?.trim()) return;
  try {
    const session = await getCheckoutSession(sessionId);
    await processBusinessCoachingCheckoutCompleted(session);
  } catch {
    // logged in fulfillment
  }
}

export default async function OwnerCircleSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  await fulfillIfNeeded(sessionId);

  return (
    <MarketingPageShell className="flex items-center py-16 sm:py-20">
      <div className="mx-auto w-full max-w-xl px-4">
        <div className={`p-6 sm:p-8 ${marketingPanel}`}>
          <CheckCircle2 className="h-12 w-12 text-[#34d399]" aria-hidden />
          <h1 className={`mt-4 text-2xl font-semibold ${marketingTextStrong}`}>Payment received</h1>
          <p className={`mt-3 text-sm leading-relaxed ${marketingTextMuted}`}>
            Thank you. Stripe has processed your $22/seat Owner Circle booking. A confirmation email
            is on its way with session date, time, and venue details.
          </p>
          <Link href={businessCoachingPath} className={`mt-6 inline-flex ${marketingBtnPrimary}`}>
            Back to Owner Circle
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
