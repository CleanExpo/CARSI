import { LMSIconRail } from '@/components/layout/LMSIconRail';
import { LMSContextPanel } from '@/components/layout/LMSContextPanel';
import { PageTransition } from '@/components/layout/PageTransition';
import { OnboardingCheck } from '@/components/lms/OnboardingCheck';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-background">
      <LMSIconRail />
      <LMSContextPanel />

      <main id="main-content" className="relative flex-1 overflow-auto">
        <PageTransition>{children}</PageTransition>
      </main>

      <OnboardingCheck />
    </div>
  );
}
