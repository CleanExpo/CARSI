import { Suspense } from 'react';
import FloatingChat from '@/components/lms/FloatingChat';
import { UtmCapture } from '@/components/lms/UtmCapture';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Silent UTM attribution — no UI rendered */}
      <Suspense fallback={null}>
        <UtmCapture />
      </Suspense>
      {children}
      <FloatingChat />
    </>
  );
}
