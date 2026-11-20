import type { Metadata } from 'next';
import { Download, FileText, TriangleAlert } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  marketingBodySm,
  marketingIconWrap,
  marketingPanel,
  marketingPanelHover,
  marketingTextMuted,
} from '@/lib/marketing/marketing-ui';
import {
  allSwmsLibraryDocuments,
  swmsDownloadHref,
  swmsTemplatesPath,
} from '@/lib/marketing/swms-templates';

const pageUrl = `https://carsi.com.au${swmsTemplatesPath}`;

export const metadata: Metadata = {
  title: 'Free SWMS Templates for Restoration and Cleaning | CARSI',
  description:
    'Nine blank Safe Work Method Statement templates for Australian restoration and cleaning work — water extraction, decontamination, fire and smoke, demolition, floor and carpet removal, working at height — plus a blank assessment report. Free, unbranded, ready to adapt.',
  keywords: [
    'SWMS template Australia',
    'safe work method statement restoration',
    'water damage restoration SWMS',
    'working at height SWMS',
    'decontamination SWMS',
    'restoration assessment report template',
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: 'Free SWMS Templates for Restoration and Cleaning | CARSI',
    description:
      'Nine blank, unbranded Safe Work Method Statement templates for Australian restoration and cleaning work, plus a blank assessment report.',
    url: pageUrl,
    siteName: 'CARSI',
    locale: 'en_AU',
    type: 'article',
  },
};

export default function SwmsTemplatesPage() {
  return (
    <MarketingPageShell>
      <MarketingSectionHeader
        eyebrow="Free resources"
        title="SWMS templates for restoration and cleaning work"
        body="Nine blank Safe Work Method Statements and a blank assessment report, built around the way Australian restoration jobs actually run. Every company, worker and client field is empty — download one, put your own details on it, and make it site-specific before anyone works to it."
      />

      <div
        className={`mb-10 flex items-start gap-4 border-l-4 border-amber-500 p-5 ${marketingPanel}`}
      >
        <span className="mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden>
          <TriangleAlert className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            A template is not a compliant SWMS
          </h2>
          <p className={`mt-2 ${marketingBodySm}`}>
            Under the harmonised WHS Regulations a SWMS must identify the hazards of the work as it
            will be done at that workplace, and it must be prepared in consultation with the workers
            who will carry it out. These documents give you the structure and a starting set of
            controls — they do not describe your site, your plant or your people. Review each one
            against the job, add what is missing, remove what does not apply, and have your workers
            sign it before work starts. Nothing here is legal or work health and safety advice.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {allSwmsLibraryDocuments.map((doc) => (
          <article
            key={doc.slug}
            className={`flex flex-col gap-4 p-6 ${marketingPanel} ${marketingPanelHover}`}
          >
            <div className="flex items-start gap-3">
              <span className={marketingIconWrap}>
                <FileText className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {doc.title}
                </h2>
                <p className={`mt-1 text-xs tracking-wide uppercase ${marketingTextMuted}`}>
                  PDF · {doc.pages} pages
                </p>
              </div>
            </div>

            <p className={marketingBodySm}>{doc.summary}</p>

            <div>
              <h3
                className={`mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase ${marketingTextMuted}`}
              >
                Covers
              </h3>
              <ul className={`space-y-1.5 ${marketingBodySm}`}>
                {doc.activities.map((activity) => (
                  <li key={activity} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#2490ed]" aria-hidden />
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={swmsDownloadHref(doc)}
              download
              className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:text-[#0f5fa8] dark:text-[#7ec5ff] dark:hover:text-white"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download {doc.title.toLowerCase()}
            </a>
          </article>
        ))}
      </div>

      <div className={`mt-12 p-6 ${marketingPanel}`}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          What you still have to add
        </h2>
        <ul className={`mt-3 space-y-2 ${marketingBodySm}`}>
          <li>
            Your company name, ABN, contacts and the project name and address — the header row is
            deliberately blank.
          </li>
          <li>
            The principal contractor details, and the name of the person responsible for ensuring
            compliance with the SWMS on that job.
          </li>
          <li>
            The hazards specific to that site: asbestos in pre-1990 structures, the electrical
            situation, structural damage, access and egress, and anything the risk table does not
            already name.
          </li>
          <li>
            Your plant and equipment register, your hazardous chemicals and their safety data
            sheets, and the training and licences your crew actually hold.
          </li>
          <li>
            The signatures. Every worker signs that they have read it, understood it and hold the
            training to do the work described.
          </li>
        </ul>
        <p className={`mt-4 ${marketingBodySm}`}>
          The reference page in each SWMS lists the Act, Regulation, regulator and codes of practice
          for every Australian jurisdiction and New Zealand. Check the codes for the state you are
          working in — a model code of practice only has legal effect once that jurisdiction
          approves it.
        </p>
      </div>
    </MarketingPageShell>
  );
}
