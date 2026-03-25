import { ReactNode } from 'react';

interface IndustryPageLayoutProps {
  children: ReactNode;
}

export function IndustryPageLayout({ children }: IndustryPageLayoutProps) {
  return (
    <main className="min-h-screen bg-background">
      {/* Single subtle gradient — matches landing page */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,hsl(var(--primary)/0.08)_0%,transparent_50%)]"
        aria-hidden="true"
      />

      <div className="relative z-10">{children}</div>
    </main>
  );
}
