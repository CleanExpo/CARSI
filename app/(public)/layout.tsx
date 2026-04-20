import { PublicFooter } from '@/components/landing/PublicFooter';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import FloatingChatGate from '@/components/lms/FloatingChatGate';
import { UtmCapture } from '@/components/lms/UtmCapture';
import { Suspense, type ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Silent UTM attribution — no UI rendered */}
      <Suspense fallback={null}>
        <UtmCapture />
      </Suspense>
      <PublicNavbar />
      <div className="mx-auto w-[94%] xl:w-[85%] 2xl:max-w-[1800px]">{children}</div>
      <PublicFooter />
      <FloatingChatGate />
    </div>
  );
}
