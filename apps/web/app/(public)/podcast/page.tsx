import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, PodcastSeriesSchema } from '@/components/seo';

export const metadata: Metadata = {
  title: 'Podcast Directory | CARSI Industry Hub',
  description:
    'Discover the best podcasts for Australian restoration, HVAC, mould remediation, indoor air quality, flooring, and pest control professionals. Curated by CARSI — including our own The Science of Property Restoration podcast.',
  keywords: [
    'restoration podcasts Australia',
    'HVAC podcast',
    'mould remediation podcast',
    'indoor air quality podcast',
    'carpet cleaning podcast',
    'pest control podcast',
    'IICRC podcast',
    'building restoration podcast',
    'property restoration podcast Australia',
    'CARSI podcast',
  ],
  openGraph: {
    title: 'Podcast Directory | CARSI Industry Hub',
    description:
      'The best podcasts for Australian restoration, HVAC, flooring, and indoor environment professionals — curated by CARSI.',
    type: 'website',
    url: 'https://carsi.com.au/podcast',
  },
  alternates: { canonical: 'https://carsi.com.au/podcast' },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

const CATEGORIES = [
  'Restoration',
  'HVAC',
  'Flooring',
  'Indoor Air Quality',
  'Mould Remediation',
  'Water Damage',
  'Carpet & Upholstery Cleaning',
  'Pest Control',
  'Healthy Homes',
  'Insurance & Claims',
  'Asthma & Chronic Illness',
  'Building & Construction',
];

interface PodcastShow {
  id: string;
  slug: string;
  name: string;
  host: string | null;
  description: string | null;
  rss_url: string | null;
  spotify_url: string | null;
  apple_podcasts_url: string | null;
  youtube_url: string | null;
  amazon_music_url: string | null;
  website_url: string | null;
  cover_image_url: string | null;
  episode_count: number | null;
  latest_episode_title: string | null;
  latest_episode_date: string | null;
  latest_episode_url: string | null;
  industry_categories: string[];
  tags: string[];
  country: string;
  is_carsi_show: boolean;
  featured: boolean;
  rss_synced_at: string | null;
  created_at: string;
}

interface PodcastListResponse {
  data: PodcastShow[];
  total: number;
  limit: number;
  offset: number;
  synced_at: string | null;
}

async function getPodcasts(category?: string, q?: string): Promise<PodcastListResponse> {
  try {
    const params = new URLSearchParams({ limit: '50', offset: '0' });
    if (category) params.set('category', category);
    if (q) params.set('q', q);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/podcasts?${params}`, {
      next: { revalidate: 3600 }, // Refresh hourly
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { data: [], total: 0, limit: 50, offset: 0, synced_at: null };
    return res.json();
  } catch {
    return { data: [], total: 0, limit: 50, offset: 0, synced_at: null };
  }
}

function formatEpisodeDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function PlatformLinks({ show }: { show: PodcastShow }) {
  const links = [
    show.spotify_url && { label: 'Spotify', href: show.spotify_url, color: '#1DB954' },
    show.apple_podcasts_url && { label: 'Apple', href: show.apple_podcasts_url, color: '#9933FF' },
    show.youtube_url && { label: 'YouTube', href: show.youtube_url, color: '#FF0000' },
    show.amazon_music_url && { label: 'Amazon', href: show.amazon_music_url, color: '#FF9900' },
    show.website_url && {
      label: 'Website',
      href: show.website_url,
      color: 'rgba(255,255,255,0.3)',
    },
  ].filter(Boolean) as { label: string; href: string; color: string }[];

  if (links.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-block rounded px-2.5 py-1 text-[10px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: link.color, color: '#fff' }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

function CARSIPodcastHero({ show }: { show: PodcastShow }) {
  return (
    <div
      className="mb-10 rounded-sm p-6 sm:p-8"
      style={{
        background: 'linear-gradient(135deg, rgba(36,144,237,0.12) 0%, rgba(36,144,237,0.04) 100%)',
        border: '1px solid rgba(36,144,237,0.25)',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-sm text-2xl sm:h-20 sm:w-20"
          style={{ background: 'rgba(36,144,237,0.15)', border: '1px solid rgba(36,144,237,0.25)' }}
          aria-hidden="true"
        >
          🎙️
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="text-[10px] font-semibold tracking-wider uppercase"
              style={{ color: '#2490ed' }}
            >
              CARSI Original
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}
            >
              Featured
            </span>
          </div>
          <h2 className="text-xl leading-snug font-bold text-white/90 sm:text-2xl">{show.name}</h2>
          {show.host && <p className="mt-0.5 text-sm text-white/40">Hosted by {show.host}</p>}
          {show.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
              {show.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/35">
            {show.episode_count != null && <span>{show.episode_count} episodes</span>}
            {show.latest_episode_date && (
              <span>Latest: {formatEpisodeDate(show.latest_episode_date)}</span>
            )}
          </div>
          <PlatformLinks show={show} />
        </div>
      </div>
    </div>
  );
}

function PodcastCard({ show }: { show: PodcastShow }) {
  const latestDate = formatEpisodeDate(show.latest_episode_date);

  return (
    <div className="group flex flex-col gap-3 rounded-sm border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-200 hover:border-[rgba(36,144,237,0.25)] hover:bg-white/[0.05]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {show.featured && (
              <span
                className="inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}
              >
                Featured
              </span>
            )}
            <span className="flex-shrink-0 text-[10px] tracking-wide text-white/25 uppercase">
              {show.country}
            </span>
          </div>
          <h3 className="text-sm leading-snug font-semibold text-white/85 transition-colors group-hover:text-white">
            {show.name}
          </h3>
          {show.host && <p className="mt-0.5 truncate text-xs text-white/35">{show.host}</p>}
        </div>
        {/* Podcast icon placeholder */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm text-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          aria-hidden="true"
        >
          🎧
        </div>
      </div>

      {/* Description */}
      {show.description && (
        <p className="line-clamp-3 text-xs leading-relaxed text-white/40">{show.description}</p>
      )}

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/30">
        {show.episode_count != null && <span>{show.episode_count} eps</span>}
        {latestDate && <span>Latest: {latestDate}</span>}
      </div>

      {/* Categories */}
      {show.industry_categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {show.industry_categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="rounded-sm px-2 py-0.5 text-[10px] text-white/35"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Platform links */}
      <PlatformLinks show={show} />
    </div>
  );
}

function PlaceholderCard() {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-dashed border-white/[0.05] bg-white/[0.01] p-5">
      <div className="space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.03]" />
      </div>
      <div className="h-8 w-full animate-pulse rounded bg-white/[0.03]" />
      <div className="flex gap-1">
        <div className="h-5 w-16 animate-pulse rounded-sm bg-white/[0.03]" />
        <div className="h-5 w-16 animate-pulse rounded-sm bg-white/[0.03]" />
      </div>
    </div>
  );
}

export default async function PodcastPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const { data: shows, total } = await getPodcasts(category, q);

  const carsiShow = shows.find((s) => s.is_carsi_show);
  const industryShows = shows.filter((s) => !s.is_carsi_show);
  const placeholderCount = Math.max(0, 3 - industryShows.length);

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'Podcast Directory', url: 'https://carsi.com.au/podcast' },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      {/* Schema for CARSI own podcast */}
      {carsiShow && (
        <PodcastSeriesSchema
          name={carsiShow.name}
          description={carsiShow.description ?? undefined}
          url="https://carsi.com.au/podcast"
          author="CARSI"
          rssUrl={carsiShow.rss_url ?? undefined}
        />
      )}
      {/* Schema for all featured industry shows */}
      {industryShows
        .filter((s) => s.featured && s.website_url)
        .map((s) => (
          <PodcastSeriesSchema
            key={s.id}
            name={s.name}
            description={s.description ?? undefined}
            url={s.website_url!}
            author={s.host ?? undefined}
            rssUrl={s.rss_url ?? undefined}
          />
        ))}

      <main className="min-h-screen bg-[#050505] px-4 py-16">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[rgba(36,144,237,0.1)] px-4 py-1.5 text-sm font-medium text-[#2490ed]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2490ed]" />
              CARSI Industry Hub
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Podcast Directory
            </h1>
            <p className="max-w-2xl text-lg text-white/50">
              The best podcasts for Australian restoration, HVAC, flooring, and indoor environment
              professionals — curated by CARSI.
            </p>
            {total > 0 && <p className="mt-2 text-sm text-white/30">{total} podcasts catalogued</p>}
          </div>

          {/* Category filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Link
              href={q ? `/podcast?q=${encodeURIComponent(q)}` : '/podcast'}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !category
                  ? 'bg-[#2490ed] text-white'
                  : 'border border-white/[0.08] text-white/50 hover:border-[rgba(36,144,237,0.35)] hover:text-white/80'
              }`}
            >
              All
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/podcast?category=${encodeURIComponent(cat)}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  category === cat
                    ? 'bg-[#2490ed] text-white'
                    : 'border border-white/[0.08] text-white/50 hover:border-[rgba(36,144,237,0.35)] hover:text-white/80'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          {/* Search info */}
          {q && (
            <div className="mb-6 flex items-center gap-3">
              <p className="text-sm text-white/40">
                Results for <span className="text-white/70">&quot;{q}&quot;</span>
              </p>
              <Link
                href={category ? `/podcast?category=${encodeURIComponent(category)}` : '/podcast'}
                className="text-xs text-white/30 underline hover:text-white/60"
              >
                Clear search
              </Link>
            </div>
          )}

          {/* CARSI Podcast — hero feature */}
          {carsiShow && !category && !q && (
            <section aria-label="CARSI original podcast">
              <h2 className="mb-4 text-xs font-semibold tracking-wider text-white/25 uppercase">
                CARSI Production
              </h2>
              <CARSIPodcastHero show={carsiShow} />
            </section>
          )}

          {/* Industry podcasts section */}
          <section aria-label="Industry podcast directory">
            {!category && !q && (
              <h2 className="mb-5 text-xs font-semibold tracking-wider text-white/25 uppercase">
                Industry Podcasts
              </h2>
            )}

            {industryShows.length === 0 && placeholderCount === 0 ? (
              <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-16 text-center">
                <p className="text-white/40">
                  {category || q
                    ? 'No podcasts match your filters. Try a different category or search term.'
                    : 'No podcasts listed yet — check back soon.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {industryShows.map((show) => (
                  <PodcastCard key={show.id} show={show} />
                ))}
                {Array.from({ length: placeholderCount }, (_, i) => (
                  <PlaceholderCard key={`placeholder-${i}`} />
                ))}
              </div>
            )}
          </section>

          {/* Submit a podcast CTA */}
          <div className="mt-12 flex items-center justify-between rounded-sm border border-white/[0.06] bg-white/[0.02] px-6 py-4">
            <div>
              <p className="text-sm font-medium text-white/80">Know a podcast we should list?</p>
              <p className="text-xs text-white/40">
                Submit industry podcasts for review — free to list for all indoor environment
                professionals.
              </p>
            </div>
            <Link
              href="/contact"
              className="rounded-sm border border-[rgba(36,144,237,0.3)] bg-[rgba(36,144,237,0.15)] px-4 py-2 text-sm font-semibold text-[#2490ed] transition-colors hover:bg-[rgba(36,144,237,0.25)]"
            >
              Submit Podcast
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
