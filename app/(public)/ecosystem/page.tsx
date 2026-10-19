import type { Metadata } from 'next';
import Link from 'next/link';

import { EcosystemCard } from '@/components/ecosystem/EcosystemCard';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { ECOSYSTEM_PAGE_COPY, ECOSYSTEM_PRODUCTS } from '@/lib/ecosystem/products';

const copy = ECOSYSTEM_PAGE_COPY;

// Static metadata: without its own canonical and Open Graph block this page would inherit the
// root layout's, which point at the homepage (app/layout.tsx), and declare itself a duplicate of /.
export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  alternates: { canonical: '/ecosystem' },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: '/ecosystem',
    siteName: 'CARSI',
    title: `${copy.metaTitle} | CARSI`,
    description: copy.metaDescription,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'CARSI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${copy.metaTitle} | CARSI`,
    description: copy.metaDescription,
    images: ['/og-image.png'],
  },
};

/** The (public) layout supplies <main>; this page renders sections only. */
export default function EcosystemPage() {
  return (
    <div data-testid="ecosystem-section">
      <section className="border-b border-slate-200/70 bg-white">
        <div className={`${PUBLIC_SHELL_INNER_CLASS} py-14 md:py-20`}>
          <p className={LANDING_EYEBROW_CLASS}>{copy.eyebrow}</p>
          <h1 className={`mt-3 max-w-3xl ${LANDING_DISPLAY_H2_CLASS}`}>{copy.heading}</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 md:text-base">
            {copy.lead}
          </p>
        </div>
      </section>

      <section aria-label={copy.eyebrow} className="py-12 md:py-16">
        <ul className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-6 md:grid-cols-2 xl:grid-cols-3`}>
          {ECOSYSTEM_PRODUCTS.map((product) => (
            <li key={product.slug}>
              <EcosystemCard product={product} />
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="ecosystem-vision-heading"
        className="border-t border-slate-200/70 bg-white py-14 md:py-20"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="max-w-3xl">
            <h2 id="ecosystem-vision-heading" className={LANDING_DISPLAY_H2_CLASS}>
              {copy.visionHeading}
            </h2>
            {copy.visionParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="mt-5 text-base leading-relaxed text-slate-700">
                {paragraph}
              </p>
            ))}
            <Link
              href={copy.ctaHref}
              className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[#146fc2] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {copy.ctaLabel}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
