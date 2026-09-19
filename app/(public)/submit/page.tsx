import type { Metadata } from 'next';
import Link from 'next/link';

import {
  COMMUNITY_CARD_CLASS,
  CommunityHubShell,
} from '@/components/marketing/hub/CommunityHubShell';

export const metadata: Metadata = {
  title: 'Submit to CARSI Hub | Industry Resource Directory',
  description:
    "Submit your podcast, YouTube channel, business profile, event, job listing, article, or news source to the CARSI Industry Hub — Australia's resource directory for restoration, HVAC, and cleaning trade professionals.",
  alternates: { canonical: 'https://carsi.com.au/submit' },
};

interface SubmissionType {
  type: string;
  title: string;
  description: string;
  detail: string;
}

const SUBMISSION_TYPES: SubmissionType[] = [
  {
    type: 'podcast',
    title: 'Podcast',
    description: 'Submit a podcast show for inclusion in the CARSI podcast directory.',
    detail: 'Restoration, HVAC, cleaning, IAQ, and adjacent trades.',
  },
  {
    type: 'youtube_channel',
    title: 'YouTube Channel',
    description: 'Nominate a YouTube channel that produces quality trade content.',
    detail: 'Educational, how-to, product reviews, and industry commentary.',
  },
  {
    type: 'professional',
    title: 'Professional Profile',
    description: 'List yourself or a colleague in the CARSI professional directory.',
    detail: 'Technicians, consultants, trainers, and industry specialists.',
  },
  {
    type: 'event',
    title: 'Industry Event',
    description: 'Submit a conference, trade show, workshop, or webinar.',
    detail: 'Australian and international events relevant to the trades.',
  },
  {
    type: 'job',
    title: 'Job Listing',
    description: 'Post a job opening for restoration, HVAC, or cleaning trade roles.',
    detail: 'Full-time, part-time, contract, and apprenticeship positions.',
  },
  {
    type: 'article',
    title: 'Article',
    description: 'Submit a technical article, case study, or industry opinion piece.',
    detail: 'Original content from practitioners, researchers, and vendors.',
  },
  {
    type: 'case_study',
    title: 'Field Case Study',
    description: 'Submit an anonymised job note or field observation for CARSI review.',
    detail: 'Methods, limits, outcomes, lessons, sources, and no customer-identifying details.',
  },
  {
    type: 'news_source',
    title: 'News Source',
    description: 'Nominate an industry publication or news outlet for the directory.',
    detail: 'Newsletters, magazines, journals, and online publications.',
  },
];

export default function SubmitIndexPage() {
  return (
    <CommunityHubShell
      eyebrow="Community & resources"
      title="Submit to the Hub"
      description="Help us build Australia’s most comprehensive resource directory for restoration, HVAC, and cleaning trade professionals. All submissions are reviewed before publication."
      stats={[
        { value: String(SUBMISSION_TYPES.length), label: 'Submission types' },
        { value: '5d', label: 'Review window' },
        { value: 'Free', label: 'To list' },
        { value: 'AU', label: 'Trade focus' },
      ]}
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SUBMISSION_TYPES.map((item, index) => (
          <Link
            key={item.type}
            href={`/submit/${item.type}`}
            className={`group flex flex-col ${COMMUNITY_CARD_CLASS}`}
          >
            <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#146fc2]">
              {String(index + 1).padStart(2, '0')}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950 group-hover:text-[#146fc2]">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.detail}</p>
            <span className="mt-5 text-sm font-semibold text-[#146fc2]">Submit →</span>
          </Link>
        ))}
      </div>

      <p className="mt-10 max-w-3xl text-sm leading-relaxed text-slate-500">
        All submissions are reviewed by the CARSI editorial team. We aim to respond within 5
        business days. Approved listings are published free of charge. Commercial advertising
        enquiries should be directed to{' '}
        <Link
          href="/contact"
          className="font-semibold text-[#146fc2] underline-offset-4 hover:underline"
        >
          contact CARSI
        </Link>
        .
      </p>
    </CommunityHubShell>
  );
}
