import type { ReactNode } from 'react';

interface IndustryPageLayoutProps {
  children: ReactNode;
}

/** Full-bleed industry page. Sections own their own homepage bands. */
export function IndustryPageLayout({ children }: IndustryPageLayoutProps) {
  return <>{children}</>;
}
