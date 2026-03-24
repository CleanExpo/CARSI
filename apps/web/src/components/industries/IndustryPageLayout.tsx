import { ReactNode } from 'react';

interface IndustryPageLayoutProps {
  children: ReactNode;
}

export function IndustryPageLayout({ children }: IndustryPageLayoutProps) {
  return (
    <main className="min-h-screen" style={{ background: '#0a0f1a' }}>
      {/* Single subtle gradient — matches landing page */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(36,144,237,0.08) 0%, transparent 50%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">{children}</div>
    </main>
  );
}
