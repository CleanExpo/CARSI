/**
 * app/(public)/professional-directory/page.tsx
 * Professional Directory — honest "coming soon" gate (GitHub #298 / GP-449).
 *
 * The NRPG member registry integration (UNI-87 Track A) has not landed yet.
 * This page intentionally renders no professional listings — showing
 * placeholder/fake member data here previously misrepresented a live
 * capability. When NRPG credentials arrive, swap this state for a real
 * listing sourced from lib/professionals.ts.
 */

import type { Metadata } from 'next';
import { OG_IMAGES } from '@/lib/seo/og-image';

export const metadata: Metadata = {
  title: 'Professional Directory — Coming Soon | CARSI Industry Hub',
  description:
    'The NRPG-accredited professional directory is in development. We are integrating directly with the National Restoration Professionals Guild member registry.',
  keywords: [
    'NRPG professionals Australia',
    'restoration professionals directory',
    'CARSI professional directory',
  ],
  openGraph: {
    images: OG_IMAGES,
    title: 'Professional Directory — Coming Soon | CARSI Industry Hub',
    description: 'The NRPG-accredited professional directory is in development.',
    type: 'website',
    url: 'https://carsi.com.au/professional-directory',
  },
  alternates: { canonical: 'https://carsi.com.au/professional-directory' },
};

export default function ProfessionalDirectoryPage() {
  return (
    <main className="min-h-screen" style={{ background: '#060a14' }}>
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        {/* Header */}
        <p
          className="mb-2 text-xs tracking-wide uppercase"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          Professional Directory
        </p>
        <h1
          className="mb-4 text-4xl font-bold tracking-tight"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          NRPG-Accredited Professionals — Coming Soon
        </h1>
        <p className="mb-10 max-w-2xl text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
          We are building a directory of restoration and indoor environment professionals,
          verified through the National Restoration Professionals Guild member registry.
        </p>

        {/* Coming-soon state */}
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-[rgba(36,144,237,0.2)] bg-[rgba(36,144,237,0.05)] px-6 py-8">
          <span
            aria-disabled="true"
            className="cursor-not-allowed rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/50"
          >
            Coming soon
          </span>
          <p className="text-sm font-medium text-white/80">
            The professional directory is being built.
          </p>
          <p className="max-w-2xl text-xs text-white/70">
            We are integrating directly with the NRPG member registry so every profile shown here
            is a real, verified member. No professionals are listed yet. In the meantime, contact{' '}
            <a href="/contact" className="underline hover:text-white/50">
              CARSI support
            </a>{' '}
            if you would like to be notified when the directory goes live.
          </p>
        </div>
      </div>
    </main>
  );
}
