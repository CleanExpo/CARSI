import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Submit to CARSI Hub | Industry Resource Directory',
  description:
    "Submit your podcast, YouTube channel, business profile, event, job listing, article, or news source to the CARSI Industry Hub — Australia's resource directory for restoration, HVAC, and cleaning trade professionals.",
  alternates: { canonical: 'https://carsi.com.au/submit' },
};

interface SubmissionType {
  type: string;
  icon: string;
  title: string;
  description: string;
  detail: string;
}

const SUBMISSION_TYPES: SubmissionType[] = [
  {
    type: 'podcast',
    icon: '🎙',
    title: 'Podcast',
    description: 'Submit a podcast show for inclusion in the CARSI podcast directory.',
    detail: 'Restoration, HVAC, cleaning, IAQ, and adjacent trades.',
  },
  {
    type: 'youtube_channel',
    icon: '▶',
    title: 'YouTube Channel',
    description: 'Nominate a YouTube channel that produces quality trade content.',
    detail: 'Educational, how-to, product reviews, and industry commentary.',
  },
  {
    type: 'professional',
    icon: '👤',
    title: 'Professional Profile',
    description: 'List yourself or a colleague in the CARSI professional directory.',
    detail: 'Technicians, consultants, trainers, and industry specialists.',
  },
  {
    type: 'event',
    icon: '📅',
    title: 'Industry Event',
    description: 'Submit a conference, trade show, workshop, or webinar.',
    detail: 'Australian and international events relevant to the trades.',
  },
  {
    type: 'job',
    icon: '💼',
    title: 'Job Listing',
    description: 'Post a job opening for restoration, HVAC, or cleaning trade roles.',
    detail: 'Full-time, part-time, contract, and apprenticeship positions.',
  },
  {
    type: 'article',
    icon: '📄',
    title: 'Article',
    description: 'Submit a technical article, case study, or industry opinion piece.',
    detail: 'Original content from practitioners, researchers, and vendors.',
  },
  {
    type: 'news_source',
    icon: '📰',
    title: 'News Source',
    description: 'Nominate an industry publication or news outlet for the directory.',
    detail: 'Newsletters, magazines, journals, and online publications.',
  },
];

export default function SubmitIndexPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold tracking-wider text-primary uppercase">
            CARSI Industry Hub
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground/90 md:text-5xl">
            Submit to the Hub
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Help us build Australia&apos;s most comprehensive resource directory for restoration,
            HVAC, and cleaning trade professionals. All submissions are reviewed before publication.
          </p>
        </div>

        {/* Submission type grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUBMISSION_TYPES.map((item) => (
            <Link
              key={item.type}
              href={`/submit/${item.type}`}
              className="group flex flex-col gap-4 rounded-sm border border-border bg-card/20 p-6 transition-all duration-200 hover:border-primary/20 hover:bg-card/40"
            >
              {/* Icon */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-muted/10 text-xl"
                aria-hidden="true"
              >
                {item.icon}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-2">
                <h2 className="text-base font-semibold text-foreground/85 transition-colors group-hover:text-foreground">
                  {item.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground/50">{item.detail}</p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary/60 transition-colors group-hover:text-primary">
                Submit
                <span
                  className="transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 rounded-sm border border-border bg-card/20 px-6 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground/50">
            All submissions are reviewed by the CARSI editorial team. We aim to respond within{' '}
            <span className="text-muted-foreground">5 business days</span>. Approved listings are published
            free of charge. Commercial advertising enquiries should be directed to{' '}
            <a
              href="mailto:hello@carsi.com.au"
              className="text-muted-foreground underline underline-offset-2 hover:text-foreground/75"
            >
              hello@carsi.com.au
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
