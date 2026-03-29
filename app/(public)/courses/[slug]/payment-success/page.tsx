import { Suspense } from 'react';
import { PaymentSuccessClient } from './PaymentSuccessClient';

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center px-4 text-white/60">
          Loading…
        </main>
      }
    >
      <PaymentSuccessClient />
    </Suspense>
  );
}
