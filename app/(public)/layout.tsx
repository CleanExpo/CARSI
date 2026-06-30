import { PUBLIC_PAGE_FULL_CLASS } from '@/components/landing/public-shell-width';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import FloatingChatGate from '@/components/lms/FloatingChatGate';
import { UtmCapture } from '@/components/lms/UtmCapture';
import { Suspense, type ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900 transition-colors duration-300 dark:bg-[#060a14] dark:text-white">
      {/* Silent UTM attribution — no UI rendered */}
      <Suspense fallback={null}>
        <UtmCapture />
      </Suspense>
      <header>
        <PublicNavbar />
      </header>
      <main id="main-content" className={PUBLIC_PAGE_FULL_CLASS}>
        {children}
      </main>
      <PublicFooter />
      <FloatingChatGate />
    </div>
  );
}
