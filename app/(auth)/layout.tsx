import Link from 'next/link';

import { PublicLogo } from '@/components/landing/PublicLogo';
import { PUBLIC_CHROME_AUTH_BAND_CLASS } from '@/components/landing/public-shell-width';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ background: '#f6f8fb' }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(36,144,237,0.12) 0%, transparent 62%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md py-12">
        <div className={`mb-8 ${PUBLIC_CHROME_AUTH_BAND_CLASS}`}>
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_0%,rgba(36,144,237,0.16),transparent_68%)]"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-3">
            <Link href="/" className="flex items-center justify-center">
              <PublicLogo variant="auth" />
            </Link>
            <Link
              href="/"
              className="text-xs font-medium text-white/58 transition-colors duration-150 hover:text-white"
            >
              &larr; Back to home
            </Link>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
