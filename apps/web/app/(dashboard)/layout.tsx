import { LMSIconRail } from '@/components/layout/LMSIconRail';
import { LMSContextPanel } from '@/components/layout/LMSContextPanel';
import { PageTransition } from '@/components/layout/PageTransition';
import { OnboardingCheck } from '@/components/lms/OnboardingCheck';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen" style={{ background: '#060a14' }}>
      {/* Animated mesh blobs — provide depth behind glass panels */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
        <div className="mesh-blob mesh-blob-3" />
      </div>

      <LMSIconRail />
      <LMSContextPanel />

      <main id="main-content" className="relative z-10 flex-1 overflow-auto">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Onboarding wizard — shown once on first login */}
      <OnboardingCheck />
    </div>
  );
}
