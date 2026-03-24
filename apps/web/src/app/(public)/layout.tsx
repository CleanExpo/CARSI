import { Suspense } from 'react';
import FloatingChat from '@/components/lms/FloatingChat';
import { UtmCapture } from '@/components/lms/UtmCapture';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Silent UTM attribution — no UI rendered */}
      <Suspense fallback={null}>
        <UtmCapture />
      </Suspense>
      <PublicNavbar />
      {children}
      <PublicFooter />
      <FloatingChat />
    </div>
  );
}
