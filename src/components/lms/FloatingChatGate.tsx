'use client';

import { Suspense } from 'react';

import FloatingChat from '@/components/lms/FloatingChat';

/** `useSearchParams` requires a Suspense boundary in the App Router. */
export default function FloatingChatGate() {
  return (
    <Suspense fallback={null}>
      <FloatingChat />
    </Suspense>
  );
}
