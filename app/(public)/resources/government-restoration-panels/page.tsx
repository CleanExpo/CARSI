import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { GovGuideForm } from '@/components/lead-magnet/GovGuideForm';
import { leadMagnetEnabled } from '@/lib/server/lead-magnet-flag';

const pageUrl = 'https://carsi.com.au/resources/government-restoration-panels';

export const metadata: Metadata = {
  title: 'How to Get on Government Restoration Panels | Free CARSI Guide',
  description:
    'A free, practical guide for Australian restoration contractors: how government procurement panels work, the certifications and WHS documentation procurement officers require, and a 90-day path to panel readiness.',
  keywords: [
    'government restoration panels Australia',
    'government contractor restoration',
    'AusTender restoration panel',
    'restoration WHS compliance',
    'IICRC CEC Accredited courses',
    'CARSI government guide',
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: 'How to Get on Government Restoration Panels | CARSI',
    description:
      'Free guide for Australian restoration contractors pursuing government panel work — procurement, certifications, WHS compliance and a 90-day action plan.',
    url: pageUrl,
    siteName: 'CARSI',
    locale: 'en_AU',
    type: 'article',
  },
};

const INSIDE = [
  {
    title: 'How government panels actually work',
    body: 'Standing-offer arrangements, the federal/state/local procurement platforms, and the panel categories restoration falls under.',
  },
  {
    title: 'The certifications procurement officers look for',
    body: 'Which IICRC certifications government tenders reference, and how to keep every credential current and auditable.',
  },
  {
    title: 'A complete WHS compliance checklist',
    body: 'WHS management system, SWMS, insurance minimums, personnel qualifications and state-specific requirements.',
  },
  {
    title: 'Your 90-day path to panel readiness',
    body: 'A week-by-week action plan, a capability-statement structure, and an AusTender search strategy.',
  },
];

export default function GovernmentRestorationPanelsPage() {
  // Ships dark: the whole page 404s until GP199_GOV_GUIDE_ENABLED is set.
  if (!leadMagnetEnabled()) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left: value proposition */}
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#0f5fa8] uppercase">
            Free guide for Australian contractors
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            How to Get on Government Restoration Panels
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Government restoration work is some of the most reliable, high-value work available to
            Australian restoration companies — predictable pipelines, agreed rates and dependable
            payment. This practical guide walks you through the requirements, certifications and
            application process for winning a place on state, federal and local government panels.
          </p>

          <ul className="mt-8 space-y-4">
            {INSIDE.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-xs"
                  style={{ background: 'rgba(20,111,194,0.1)', color: '#146fc2' }}
                  aria-hidden="true"
                >
                  &#10003;
                </span>
                <span className="text-sm leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">{item.title}.</span> {item.body}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs leading-5 text-slate-500">
            CARSI is an IICRC CEC Accredited provider. Our online, self-paced courses earn IICRC
            Continuing Education Credits (CECs) toward maintaining an existing IICRC certification —
            so your team keeps its credentials current without losing billable days.
          </p>
        </div>

        {/* Right: capture form */}
        <div className="lg:pt-4">
          <div
            className="rounded-2xl bg-slate-50 p-6 shadow-sm sm:p-8"
            style={{ border: '1px solid rgba(15,23,42,0.08)' }}
          >
            <h2 className="text-lg font-bold text-slate-900">Get the guide (free)</h2>
            <p className="mt-1 mb-5 text-sm text-slate-600">
              Enter your email and we&apos;ll send you the PDF straight away.
            </p>
            <GovGuideForm
              leadContext={{
                source: 'government-restoration-panels',
                topic: 'How to Get on Government Restoration Panels',
                intent: 'lead-magnet-download',
                pageUrl,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
