import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { CCW_COOKIE_NAME, verifyCcwAccessToken } from '@/lib/ccw/access-token';
import { CCW_MATERIALS } from '@/lib/ccw/file-registry';

import { CcwGate } from './CcwGate';
import { CcwMaterialsPanel } from './CcwMaterialsPanel';

export const metadata: Metadata = {
  title: 'CCW Workshop Materials — Participant Access',
  description: 'Private take-home materials for 2-Day Carpet Cleaning Workshop participants.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

// Access state is cookie-driven and must never be cached.
export const dynamic = 'force-dynamic';

export default async function CcwMaterialsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CCW_COOKIE_NAME)?.value;
  const authed = await verifyCcwAccessToken(token);

  return (
    <main className="relative min-h-screen" style={{ background: '#060a14' }}>
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        <p
          className="mb-2 text-xs tracking-wide uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          CARSI × CCW — Participant Access
        </p>
        <h1
          className="mb-2 text-4xl font-bold tracking-tight"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          2-Day Carpet Cleaning Workshop — Take-Home Materials
        </h1>
        <p className="mb-10 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          These materials are provided to registered workshop participants. Enter the access
          password you were given at the course to unlock your downloads.
        </p>

        {authed ? <CcwMaterialsPanel materials={[...CCW_MATERIALS]} /> : <CcwGate />}
      </div>
    </main>
  );
}
