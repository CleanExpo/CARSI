import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, VideoObjectSchema } from '@/components/seo';

export const metadata: Metadata = {
  title: 'YouTube Channel Directory | CARSI Industry Hub',
  description:
    'Discover the best YouTube channels covering Australian disaster restoration, HVAC, flooring, mould remediation, indoor air quality, and pest control. Curated by CARSI.',
  keywords: [
    'restoration YouTube channels',
    'HVAC training YouTube',
    'flooring installation videos',
    'mould remediation training',
    'indoor air quality YouTube',
    'CARSI YouTube',
    'restoration industry videos Australia',
    'pest control training',
  ],
  openGraph: {
    title: 'YouTube Channel Directory | CARSI Industry Hub',
    description:
      'The best YouTube channels for Australian restoration, HVAC, flooring, and indoor environment professionals — curated by CARSI.',
    type: 'website',
    url: 'https://carsi.com.au/youtube',
  },
  alternates: { canonical: 'https://carsi.com.au/youtube' },
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
  'Occupational Hygiene',
  'Insurance',
];

interface YouTubeChannel {
  id: string;
  youtube_channel_id: string;
  channel_url: string;
  custom_url: string | null;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  subscriber_count: number | null;
  video_count: number | null;
  latest_upload_title: string | null;
  latest_upload_url: string | null;
  latest_upload_date: string | null;
  latest_upload_thumbnail: string | null;
  industry_categories: string[];
  tags: string[];
  is_carsi_channel: boolean;
  featured: boolean;
  synced_at: string | null;
  created_at: string;
}

interface ChannelListResponse {
  data: YouTubeChannel[];
  total: number;
  limit: number;
  offset: number;
  synced_at: string | null;
}

async function getChannels(category?: string, q?: string): Promise<ChannelListResponse> {
  try {
    const params = new URLSearchParams({ limit: '50', offset: '0' });
    if (category) params.set('category', category);
    if (q) params.set('q', q);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/youtube-channels?${params}`, {
      next: { revalidate: 3600 }, // cache 1 hour — weekly sync means data changes slowly
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { data: [], total: 0, limit: 50, offset: 0, synced_at: null };
    return res.json();
  } catch {
    return { data: [], total: 0, limit: 50, offset: 0, synced_at: null };
  }
}

function formatSubscribers(n: number | null): string {
  if (n === null) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M subscribers`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K subscribers`;
  return `${n} subscribers`;
}

function ChannelCard({ channel }: { channel: YouTubeChannel }) {
  const isCarsi = channel.is_carsi_channel;
  return (
    <a
      href={channel.channel_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-200 hover:shadow-[0_8px_40px_rgba(36,144,237,0.12)] ${
        isCarsi
          ? 'border-[rgba(36,144,237,0.4)] bg-[rgba(36,144,237,0.06)] hover:border-[rgba(36,144,237,0.6)]'
          : 'border-white/[0.08] bg-white/[0.03] hover:border-[rgba(36,144,237,0.35)] hover:bg-white/[0.06]'
      }`}
    >
      {/* Header row: thumbnail + name */}
      <div className="flex items-start gap-4">
        {channel.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnail_url}
            alt={channel.name}
            className="h-14 w-14 flex-shrink-0 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(255,0,0,0.15)] ring-2 ring-white/10">
            <svg className="h-6 w-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
            </svg>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base leading-snug font-semibold text-white/90 transition-colors group-hover:text-[#2490ed]">
              {channel.name}
            </h2>
            {isCarsi && (
              <span className="inline-flex items-center rounded-full bg-[rgba(36,144,237,0.2)] px-2.5 py-0.5 text-xs font-medium text-[#2490ed]">
                CARSI Channel
              </span>
            )}
            {channel.featured && !isCarsi && (
              <span className="inline-flex items-center rounded-full bg-[rgba(234,179,8,0.15)] px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                Featured
              </span>
            )}
          </div>

          {channel.custom_url && (
            <p className="mt-0.5 text-xs text-white/30">{channel.custom_url}</p>
          )}

          {channel.subscriber_count !== null && (
            <p className="mt-1 text-xs font-medium text-white/50">
              {formatSubscribers(channel.subscriber_count)}
              {channel.video_count !== null && (
                <span className="ml-2 text-white/25">· {channel.video_count} videos</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {channel.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-white/45">{channel.description}</p>
      )}

      {/* Category tags */}
      {channel.industry_categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {channel.industry_categories.slice(0, 4).map((cat) => (
            <span
              key={cat}
              className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-white/40 capitalize"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Latest upload */}
      {channel.latest_upload_title && (
        <div className="rounded-lg bg-white/[0.03] px-3 py-2.5">
          <p className="mb-1 text-xs text-white/25">Latest video</p>
          <p className="line-clamp-1 text-xs font-medium text-white/60">
            {channel.latest_upload_title}
          </p>
          {channel.latest_upload_date && (
            <p className="mt-0.5 text-xs text-white/25">
              {new Date(channel.latest_upload_date).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between text-xs text-white/25">
        <span className="text-[#ff4444]/60">youtube.com</span>
        <span className="flex items-center gap-1 text-[#2490ed]/60 transition-colors group-hover:text-[#2490ed]">
          Visit channel ↗
        </span>
      </div>
    </a>
  );
}

function PlaceholderCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01] p-6">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.05]" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.03]" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.03]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.03]" />
      </div>
      <p className="mt-auto text-xs text-white/20">Loading channels...</p>
    </div>
  );
}

export default async function YouTubePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const { data: channels, total, synced_at } = await getChannels(category, q);

  const carsiChannels = channels.filter((c) => c.is_carsi_channel);
  const industryChannels = channels.filter((c) => !c.is_carsi_channel);
  const placeholderCount = channels.length === 0 ? 3 : 0;

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'YouTube Directory', url: 'https://carsi.com.au/youtube' },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      {/* VideoObject schema for channels with latest uploads */}
      {channels
        .filter((c) => c.latest_upload_title && c.latest_upload_url)
        .slice(0, 10)
        .map((c) => (
          <VideoObjectSchema
            key={c.id}
            name={c.latest_upload_title!}
            description={c.description ?? undefined}
            thumbnailUrl={c.latest_upload_thumbnail ?? undefined}
            uploadDate={c.latest_upload_date ?? undefined}
            url={c.latest_upload_url!}
            channelName={c.name}
            channelUrl={c.channel_url}
          />
        ))}

      <main className="min-h-screen bg-[#050505] px-4 py-16">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[rgba(255,0,0,0.08)] px-4 py-1.5 text-sm font-medium text-red-400">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
              </svg>
              YouTube Directory
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Industry YouTube Channels
            </h1>
            <p className="max-w-2xl text-lg text-white/50">
              The best YouTube channels for Australian restoration, HVAC, flooring, indoor air
              quality, and environmental professionals — curated and updated weekly by CARSI.
            </p>
            <div className="mt-3 flex items-center gap-4 text-sm text-white/30">
              {total > 0 && <span>{total} channels</span>}
              {synced_at ? (
                <span>
                  Stats updated{' '}
                  {new Date(synced_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              ) : (
                <span>Weekly stats sync pending API key</span>
              )}
            </div>
          </div>

          {/* Category filter */}
          <div className="mb-10 flex flex-wrap gap-2">
            <Link
              href="/youtube"
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
                href={`/youtube?category=${encodeURIComponent(cat)}`}
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

          {/* CARSI channel — always at the top when not filtered out */}
          {carsiChannels.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-4 text-sm font-semibold tracking-widest text-white/30 uppercase">
                CARSI Channel
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {carsiChannels.map((c) => (
                  <ChannelCard key={c.id} channel={c} />
                ))}
              </div>
            </div>
          )}

          {/* Industry channels grid */}
          {channels.length === 0 && placeholderCount === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-16 text-center">
              <p className="text-white/40">
                {category
                  ? `No channels found in "${category}" — try a different category.`
                  : 'Channel data is loading.'}
              </p>
            </div>
          ) : (
            <>
              {industryChannels.length > 0 && (
                <>
                  {carsiChannels.length > 0 && (
                    <h2 className="mb-4 text-sm font-semibold tracking-widest text-white/30 uppercase">
                      Industry Channels
                    </h2>
                  )}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {industryChannels.map((c) => (
                      <ChannelCard key={c.id} channel={c} />
                    ))}
                    {Array.from({ length: placeholderCount }, (_, i) => (
                      <PlaceholderCard key={`placeholder-${i}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* CTA — suggest a channel */}
          <div className="mt-16 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold text-white/85">
              Know a channel we should add?
            </h3>
            <p className="mb-4 text-sm text-white/40">
              If you run or follow a great industry YouTube channel that belongs in this directory,
              let us know.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-[#2490ed] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Suggest a Channel
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
