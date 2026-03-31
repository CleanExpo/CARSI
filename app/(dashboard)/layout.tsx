import { LMSContextPanel } from '@/components/layout/LMSContextPanel';
import { LMSIconRail } from '@/components/layout/LMSIconRail';
import { PageTransition } from '@/components/layout/PageTransition';
import { OnboardingCheck } from '@/components/lms/OnboardingCheck';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex h-screen max-h-[100dvh] w-full max-w-[100vw] overflow-hidden"
      style={{ background: '#060a14' }}
    >
      <div className="mesh-bg pointer-events-none" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
        <div className="mesh-blob mesh-blob-3" />
      </div>

      <LMSIconRail />
      <LMSContextPanel />

      {/* Only this region scrolls; sidebars stay fixed to the viewport */}
      <main
        id="main-content"
        className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
      >
        <div className="flex min-h-0 w-full max-w-none min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      <OnboardingCheck />
      {/* <FloatingChat /> */}
    </div>
  );
}
