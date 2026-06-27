import { SkipToMain } from '@/components/a11y/SkipToMain';
import { DashboardLightTheme } from '@/components/dashboard/DashboardLightTheme';
import { DashboardMobileNav } from '@/components/layout/DashboardMobileNav';
import { LMSContextPanel } from '@/components/layout/LMSContextPanel';
import { PageTransition } from '@/components/layout/PageTransition';
import FloatingChatGate from '@/components/lms/FloatingChatGate';
import { OnboardingCheck } from '@/components/lms/OnboardingCheck';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex h-screen max-h-[100dvh] w-full max-w-[100vw] overflow-hidden"
      style={{ background: '#f6f8fb' }}
    >
      <DashboardLightTheme />
      <SkipToMain />
      <LMSContextPanel />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardMobileNav />

        {/* Only this region scrolls; sidebars stay fixed to the viewport */}
        <main
          id="main-content"
          className="dashboard-light relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain text-slate-900"
        >
        <div className="flex min-h-0 w-full max-w-none min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <PageTransition>{children}</PageTransition>
        </div>
        </main>
      </div>

      <OnboardingCheck />
      <FloatingChatGate />
    </div>
  );
}
