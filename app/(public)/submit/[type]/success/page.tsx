import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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

const TYPE_LABELS: Record<SubmissionType, string> = {
  podcast: 'Podcast',
  youtube_channel: 'YouTube Channel',
  professional: 'Professional Profile',
  event: 'Industry Event',
  job: 'Job Listing',
  article: 'Article',
  news_source: 'News Source',
};

export const metadata: Metadata = {
  title: 'Submission Received | CARSI Industry Hub',
  description:
    'Your submission has been received and is pending review by the CARSI editorial team.',
  robots: { index: false },
};

export default async function SubmitSuccessPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!isValidType(type)) {
    redirect('/submit');
  }

  const typeLabel = TYPE_LABELS[type];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-16">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-sm"
          style={{
            background: 'rgba(0,255,136,0.06)',
            border: '0.5px solid rgba(0,255,136,0.2)',
          }}
          aria-hidden="true"
        >
          <svg
            className="h-9 w-9"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            style={{ color: '#00FF88' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white/90">
          Submission Received
        </h1>

        {/* Sub-heading */}
        <p className="mb-2 text-sm font-medium" style={{ color: '#00FF88' }}>
          {typeLabel} submission queued for review
        </p>

        {/* Body copy */}
        <p className="mb-10 text-sm leading-relaxed text-white/45">
          Thank you for contributing to the CARSI Hub. Our editorial team will review your
          submission and get back to you within{' '}
          <span className="text-white/65">5 business days</span>. Approved listings are published
          free of charge.
        </p>

        {/* Info box */}
        <div className="mb-10 rounded-sm border-[0.5px] border-white/[0.06] bg-white/[0.02] px-5 py-4 text-left">
          <h2 className="mb-3 text-xs font-semibold tracking-wider text-white/35 uppercase">
            What Happens Next
          </h2>
          <ol className="space-y-3">
            {[
              'You will receive an email confirmation at the address you provided.',
              'Our team reviews your submission against our editorial guidelines.',
              'If approved, your listing will be published to the relevant Hub directory.',
              'If we need more information, we will contact you directly.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-xs text-white/45">
                <span
                  className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm text-[9px] font-bold"
                  style={{
                    background: 'rgba(0,245,255,0.08)',
                    border: '0.5px solid rgba(0,245,255,0.15)',
                    color: '#00F5FF',
                  }}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: 'rgba(0,245,255,0.10)',
              border: '0.5px solid rgba(0,245,255,0.25)',
              color: '#00F5FF',
            }}
          >
            Submit Another
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-sm border-[0.5px] border-white/[0.08] px-5 py-2.5 text-sm text-white/55 transition-colors hover:border-white/[0.15] hover:text-white/75"
          >
            Return to Home
          </Link>
        </div>

        {/* Contact note */}
        <p className="mt-10 text-xs text-white/25">
          Questions?{' '}
          <a
            href="mailto:hello@carsi.com.au"
            className="text-white/40 underline underline-offset-2 hover:text-white/60"
          >
            hello@carsi.com.au
          </a>
        </p>
      </div>
    </main>
  );
}
