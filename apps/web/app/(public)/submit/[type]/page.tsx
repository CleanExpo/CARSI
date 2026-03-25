import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SubmissionForm } from '@/components/submit/SubmissionForm';

/* ─── Allowed submission types ───────────────────────────────────────────── */

const VALID_TYPES = [
  'podcast',
  'youtube_channel',
  'professional',
  'event',
  'job',
  'article',
  'news_source',
] as const;

type SubmissionType = (typeof VALID_TYPES)[number];

function isValidType(value: string): value is SubmissionType {
  return (VALID_TYPES as readonly string[]).includes(value);
}

/* ─── Type display config ─────────────────────────────────────────────────── */

interface TypeConfig {
  label: string;
  icon: string;
  urlLabel: string;
  urlPlaceholder?: string;
  tagline: string;
}

const TYPE_CONFIG: Record<SubmissionType, TypeConfig> = {
  podcast: {
    label: 'Podcast',
    icon: '🎙',
    urlLabel: 'Podcast URL (RSS, Spotify, Apple, or website)',
    urlPlaceholder: 'https://podcasts.apple.com/...',
    tagline: 'Submit a podcast for review and inclusion in the CARSI podcast directory.',
  },
  youtube_channel: {
    label: 'YouTube Channel',
    icon: '▶',
    urlLabel: 'YouTube Channel URL',
    urlPlaceholder: 'https://www.youtube.com/@channelname',
    tagline: 'Nominate a YouTube channel that creates valuable trade content.',
  },
  professional: {
    label: 'Professional Profile',
    icon: '👤',
    urlLabel: 'LinkedIn or Professional Website URL',
    urlPlaceholder: 'https://www.linkedin.com/in/...',
    tagline: 'List yourself or a colleague in the CARSI professional directory.',
  },
  event: {
    label: 'Industry Event',
    icon: '📅',
    urlLabel: 'Event URL',
    urlPlaceholder: 'https://...',
    tagline: 'Submit a conference, trade show, workshop, or webinar.',
  },
  job: {
    label: 'Job Listing',
    icon: '💼',
    urlLabel: 'Job Listing URL',
    urlPlaceholder: 'https://...',
    tagline: 'Post a position in the CARSI job board for trade professionals.',
  },
  article: {
    label: 'Article',
    icon: '📄',
    urlLabel: 'Article URL',
    urlPlaceholder: 'https://...',
    tagline: 'Submit a technical article, case study, or opinion piece for the Hub.',
  },
  news_source: {
    label: 'News Source',
    icon: '📰',
    urlLabel: 'Publication / Newsletter URL',
    urlPlaceholder: 'https://...',
    tagline: 'Nominate an industry publication or news outlet for the directory.',
  },
};

/* ─── Guidelines fetcher ──────────────────────────────────────────────────── */

interface SubmissionGuideline {
  id: string;
  submission_type: string;
  title: string;
  intro_text: string | null;
  eligibility_criteria: string[] | null;
  guidelines: { heading: string; body: string }[] | null;
  updated_at: string;
}

async function getGuidelines(type: string): Promise<SubmissionGuideline | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/submission_guidelines?submission_type=eq.${encodeURIComponent(type)}&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Accept: 'application/json',
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as SubmissionGuideline[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/* ─── Metadata ────────────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  if (!isValidType(type)) {
    return { title: 'Submit | CARSI Hub' };
  }
  const config = TYPE_CONFIG[type];
  return {
    title: `Submit a ${config.label} | CARSI Industry Hub`,
    description: config.tagline,
    alternates: { canonical: `https://carsi.com.au/submit/${type}` },
  };
}

/* ─── Static params ───────────────────────────────────────────────────────── */

export function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function SubmitTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!isValidType(type)) {
    redirect('/submit');
  }

  const config = TYPE_CONFIG[type];
  const guidelines = await getGuidelines(type);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-white/30" aria-label="Breadcrumb">
          <Link href="/submit" className="transition-colors hover:text-white/60">
            Submit to Hub
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-white/55">{config.label}</span>
        </nav>

        {/* Header */}
        <div className="mb-10 flex items-start gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-sm text-2xl"
            style={{
              background: 'rgba(0,245,255,0.06)',
              border: '0.5px solid rgba(0,245,255,0.15)',
            }}
            aria-hidden="true"
          >
            {config.icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white/90 md:text-4xl">
              Submit a {config.label}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/45">{config.tagline}</p>
          </div>
        </div>

        {/* Guidelines section — rendered when available */}
        {guidelines ? (
          <section
            className="mb-10 rounded-sm border-[0.5px] border-white/[0.06] bg-white/[0.02] p-6 md:p-8"
            aria-labelledby="guidelines-heading"
          >
            <h2 id="guidelines-heading" className="mb-1 text-base font-semibold text-white/85">
              {guidelines.title}
            </h2>

            {guidelines.intro_text && (
              <p className="mt-3 text-sm leading-relaxed text-white/50">{guidelines.intro_text}</p>
            )}

            {guidelines.eligibility_criteria && guidelines.eligibility_criteria.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-white/35 uppercase">
                  Eligibility Criteria
                </h3>
                <ul className="space-y-2">
                  {guidelines.eligibility_criteria.map((criterion, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/50">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-sm"
                        style={{ background: 'rgba(0,245,255,0.5)' }}
                        aria-hidden="true"
                      />
                      {criterion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {guidelines.guidelines && guidelines.guidelines.length > 0 && (
              <div className="mt-6 space-y-1">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-white/35 uppercase">
                  Guidelines
                </h3>
                {guidelines.guidelines.map((item, i) => (
                  <details key={i} className="group border-b border-white/[0.05] last:border-0">
                    <summary className="flex cursor-pointer items-center justify-between py-3 text-sm font-medium text-white/65 transition-colors hover:text-white/85 [&::-webkit-details-marker]:hidden">
                      {item.heading}
                      <svg
                        className="h-3.5 w-3.5 flex-shrink-0 text-white/30 transition-transform group-open:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="pb-4 text-sm leading-relaxed text-white/40">{item.body}</div>
                  </details>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Fallback guidelines when Supabase row is absent */
          <section
            className="mb-10 rounded-sm border-[0.5px] border-white/[0.06] bg-white/[0.02] px-6 py-5"
            aria-label="Submission guidelines"
          >
            <h2 className="mb-2 text-sm font-semibold text-white/70">Before You Submit</h2>
            <ul className="space-y-2">
              {[
                'Content must be relevant to the Australian restoration, HVAC, or cleaning trades.',
                'Submissions must link to publicly accessible resources.',
                'Listings are free — we do not accept paid placements via this form.',
                'The CARSI team reviews all submissions before publication.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-white/45">
                  <span
                    className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-sm"
                    style={{ background: 'rgba(0,245,255,0.4)' }}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Form */}
        <SubmissionForm submissionType={type} urlLabel={config.urlLabel} />
      </div>
    </main>
  );
}
