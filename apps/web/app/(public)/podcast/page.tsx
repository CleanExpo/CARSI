import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Science of Property Restoration Podcast | CARSI',
  description:
    "Listen to The Science of Property Restoration — CARSI's podcast exploring water damage, mould remediation, carpet cleaning, and restoration science with industry experts.",
  openGraph: {
    title: 'The Science of Property Restoration Podcast | CARSI',
    description:
      'Industry insights on water damage restoration, mould remediation, and cleaning science from CARSI.',
    type: 'website',
  },
};

const SPOTIFY_SHOW_ID = '4FVBn8Cfyx2jOx0m4MksuG';

const PLATFORMS = [
  {
    name: 'Spotify',
    href: `https://open.spotify.com/show/${SPOTIFY_SHOW_ID}`,
    color: '#1DB954',
  },
  {
    name: 'Apple Podcasts',
    href: 'https://podcasts.apple.com/au/podcast/the-science-of-property-restoration/id1634567890',
    color: '#9933FF',
  },
  {
    name: 'Amazon Music',
    href: 'https://music.amazon.com.au/podcasts/the-science-of-property-restoration',
    color: '#FF9900',
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg',
    color: '#FF0000',
  },
];

const TOPICS = [
  'Water damage restoration science',
  'Mould remediation techniques',
  'Carpet & upholstery care',
  'Structural drying principles',
  'IICRC certification pathways',
  'Industry news & updates',
  'Business tips for restorers',
  'Expert interviews',
];

export default function PodcastPage() {
  return (
    <main className="min-h-screen" style={{ background: '#060a14' }}>
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <p
          className="mb-2 text-xs tracking-wide uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          CARSI Podcast
        </p>
        <h1
          className="mb-3 text-4xl font-bold tracking-tight"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          The Science of Property Restoration
        </h1>
        <p
          className="mb-8 max-w-2xl text-sm leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Deep-dive conversations on water damage restoration, mould remediation, carpet cleaning,
          and the science behind modern restoration practices. Hosted by CARSI, featuring industry
          experts from across Australia and beyond.
        </p>

        {/* Platform links */}
        <div className="mb-10 flex flex-wrap gap-3">
          {PLATFORMS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm px-4 py-2.5 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: p.color, color: '#fff' }}
            >
              Listen on {p.name}
            </a>
          ))}
        </div>

        {/* Spotify embed */}
        <div
          className="mb-10 overflow-hidden rounded-lg"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <iframe
            src={`https://open.spotify.com/embed/show/${SPOTIFY_SHOW_ID}?utm_source=generator&theme=0`}
            width="100%"
            height="352"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="The Science of Property Restoration on Spotify"
            className="block"
            style={{ borderRadius: 0 }}
          />
        </div>

        {/* Topics grid */}
        <div
          className="mb-10 rounded-lg p-6"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Topics We Cover
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {TOPICS.map((topic) => (
              <div
                key={topic}
                className="rounded-sm px-3 py-2 text-xs"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {topic}
              </div>
            ))}
          </div>
        </div>

        {/* CTA cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            className="rounded-lg p-5"
            style={{
              background: 'rgba(36,144,237,0.05)',
              border: '1px solid rgba(36,144,237,0.15)',
            }}
          >
            <h3 className="mb-2 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Want to be a guest?
            </h3>
            <p className="mb-3 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              If you&apos;re a restoration professional with insights to share, we&apos;d love to
              have you on the show.
            </p>
            <Link
              href="/contact"
              className="inline-block rounded-sm px-4 py-2 text-xs font-semibold"
              style={{ background: '#2490ed', color: '#fff' }}
            >
              Get in Touch
            </Link>
          </div>

          <div
            className="rounded-lg p-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3 className="mb-2 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Start Learning
            </h3>
            <p className="mb-3 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Ready to earn IICRC CECs? Browse our full course catalogue and start your learning
              journey.
            </p>
            <Link
              href="/courses"
              className="inline-block rounded-sm px-4 py-2 text-xs font-semibold"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              View Courses
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
