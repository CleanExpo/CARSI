import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import FloatingChatGate from '@/components/lms/FloatingChatGate';
import { UtmCapture } from '@/components/lms/UtmCapture';
import { Suspense, type ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      {/* Silent UTM attribution — no UI rendered */}
      <Suspense fallback={null}>
        <UtmCapture />
      </Suspense>
      <PublicNavbar />
      <div className={PUBLIC_SHELL_INNER_CLASS}>{children}</div>
      <PublicFooter />
      <FloatingChatGate />
    </div>
  );
}
