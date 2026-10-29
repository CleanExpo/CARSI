import type { Metadata } from 'next';
import { Suspense } from 'react';
import { isPurchaseSurveyEnabled } from '@/lib/server/purchase-survey-flag';
import { PaymentSuccessClient } from './PaymentSuccessClient';

// Post-checkout utility page: never a search result (route-canonical.test.ts).
export const metadata: Metadata = {
  title: 'Payment received',
  robots: { index: false, follow: false },
};

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center px-4 text-white/60">
          Loading…
        </main>
      }
    >
      <PaymentSuccessClient surveyEnabled={isPurchaseSurveyEnabled()} />
    </Suspense>
  );
}
