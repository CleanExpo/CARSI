import type { Metadata } from 'next';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { ResourcesBrowser } from '@/components/resources/ResourcesBrowser';
import { ItemListSchema } from '@/components/seo/JsonLd';
import { FREE_RESOURCES } from '@/lib/resources/free-resources';

const pageUrl = 'https://carsi.com.au/resources';

export const metadata: Metadata = {
  title: 'Free Resources for Restoration and Cleaning Professionals | CARSI',
  description:
    'Free guides, handbooks and fact sheets from Australian and New Zealand government bodies on moisture, ventilation, timber floors, flooding and mould. Open licences only, linked to the official source.',
  alternates: { canonical: pageUrl },
  openGraph: {
    title: 'Free Resources for Restoration and Cleaning Professionals | CARSI',
    description:
      'Open-licence government guides on moisture, ventilation, timber, flood recovery and mould, linked to the official publisher.',
    url: pageUrl,
    siteName: 'CARSI',
    locale: 'en_AU',
    type: 'website',
  },
};

const SELECTION_NOTES = [
  {
    heading: 'Open licences only',
    body: 'We list a publication only when it carries a Creative Commons Attribution licence, a CC0 dedication, or is legislation with no copyright. Anything with non-commercial, no-derivatives or unclear terms is left out.',
  },
  {
    heading: 'Linked to the official source',
    body: 'Every card goes to the publisher’s own site. CARSI does not copy or host the files, so you always get the publisher’s current version.',
  },
  {
    heading: 'Checked on the read date',
    body: 'Each card shows the day we last checked the item and its licence. Publishers update and withdraw documents, so confirm the current version on their site before you rely on it.',
  },
  {
    heading: 'No affiliation',
    body: 'CARSI is not affiliated with, endorsed by or partnered with any publisher listed here. Licences cover the publisher’s own text only, and logos, trade marks, photographs and third-party material are excluded. These resources are general information, not legal or engineering advice.',
  },
] as const;

export default function FreeResourcesPage() {
  return (
    <>
      <ItemListSchema
        name="CARSI Free Resources"
        description="Open-licence Australian and New Zealand government guides for restoration and cleaning professionals, linked to the official source."
        items={FREE_RESOURCES.map((item) => ({
          name: item.title,
          url: item.url,
          description: item.note,
        }))}
      />

      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-14 md:py-20`}>
          <p className={LANDING_EYEBROW_CLASS}>Free Resources</p>
          <h1 className={`${LANDING_DISPLAY_H2_CLASS} mt-4 max-w-3xl`}>
            Free guides for restoration and cleaning professionals
          </h1>
          <p className={`${LANDING_LEAD_CLASS} mt-5 max-w-3xl`}>
            Handbooks, fact sheets and codes from Australian and New Zealand government bodies,
            gathered in one place. Each one is openly licensed and links straight to the publisher.
            Use the filters to narrow the list by topic or by state.
          </p>
        </div>
      </section>

      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-10 md:py-14`}>
        <ResourcesBrowser />

        <section
          aria-labelledby="how-we-choose-heading"
          className="mt-14 rounded-xl border border-slate-200 bg-white p-6 md:p-8"
        >
          <h2 id="how-we-choose-heading" className="text-xl font-semibold text-slate-900">
            How we choose free resources
          </h2>
          <dl className="mt-5 grid gap-6 md:grid-cols-2">
            {SELECTION_NOTES.map((note) => (
              <div key={note.heading}>
                <dt className="text-sm font-semibold text-slate-900">{note.heading}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-700">{note.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
