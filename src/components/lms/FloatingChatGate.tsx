'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import FloatingChat from '@/components/lms/FloatingChat';

/** `useSearchParams` requires a Suspense boundary in the App Router. */
export default function FloatingChatGate() {
  const pathname = usePathname();

  if (pathname === '/events/ccw-roadshow') {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <FloatingChat />
    </Suspense>
  );
}
