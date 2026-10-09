import { SkipToMain } from '@/components/a11y/SkipToMain';

export const dynamic = 'force-dynamic';

export default function CoachingPortalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipToMain />
      <div id="main-content">{children}</div>
    </>
  );
}
