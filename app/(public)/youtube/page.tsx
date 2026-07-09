import type { Metadata } from 'next';
import { BreadcrumbSchema, VideoObjectSchema } from '@/components/seo';
import { MarketingPageShell, marketingPageInnerClass } from '@/components/marketing/MarketingPageShell';
import {
  HubCategoryPills,
  HubEmptyState,
  HubPageHeader,
  HubPlaceholderCard,
  HubSectionLabel,
  HubSuggestBanner,
} from '@/components/marketing/hub/HubUi';
import { getBackendOrigin } from '@/lib/env/public-url';
import {
  marketingHubCard,
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';
import { OG_IMAGES } from '@/lib/seo/og-image';

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
    images: OG_IMAGES,
    title: 'YouTube Channel Directory | CARSI Industry Hub',
    description:
      'The best YouTube channels for Australian restoration, HVAC, flooring, and indoor environment professionals — curated by CARSI.',
    type: 'website',
    url: 'https://carsi.com.au/youtube',
  },
  alternates: { canonical: 'https://carsi.com.au/youtube' },
};

const BACKEND_URL = getBackendOrigin();

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
      next: { revalidate: 3600 },
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
      className={`group flex flex-col gap-4 p-6 ${marketingHubCard} ${
        isCarsi
          ? 'border-[#2490ed]/35 bg-[#eef7ff]/60 dark:border-[#2490ed]/40 dark:bg-[#2490ed]/10'
          : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {channel.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnail_url}
            alt={channel.name}
            className="h-14 w-14 flex-shrink-0 rounded-full object-cover ring-2 ring-slate-200/80 dark:ring-white/10"
          />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-red-50 ring-2 ring-slate-200/80 dark:bg-[rgba(255,0,0,0.15)] dark:ring-white/10">
            <svg className="h-6 w-6 text-red-500 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
            </svg>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className={`text-base leading-snug font-semibold transition-colors group-hover:text-[#2490ed] ${marketingTextStrong}`}
            >
              {channel.name}
            </h2>
            {isCarsi && (
              <span className="inline-flex items-center rounded-full bg-[#eef7ff] px-2.5 py-0.5 text-xs font-medium text-[#146fc2] dark:bg-[rgba(36,144,237,0.2)] dark:text-[#2490ed]">
                CARSI Channel
              </span>
            )}
            {channel.featured && !isCarsi && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-[rgba(234,179,8,0.15)] dark:text-yellow-400">
                Featured
              </span>
            )}
          </div>

          {channel.custom_url && (
            <p className={`mt-0.5 text-xs ${marketingTextSubtle}`}>{channel.custom_url}</p>
          )}

          {channel.subscriber_count !== null && (
            <p className={`mt-1 text-xs font-medium ${marketingTextMuted}`}>
              {formatSubscribers(channel.subscriber_count)}
              {channel.video_count !== null && (
                <span className={`ml-2 ${marketingTextSubtle}`}>· {channel.video_count} videos</span>
              )}
            </p>
          )}
        </div>
      </div>

      {channel.description && (
        <p className={`line-clamp-2 text-sm leading-relaxed ${marketingTextMuted}`}>
          {channel.description}
        </p>
      )}

      {channel.industry_categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {channel.industry_categories.slice(0, 4).map((cat) => (
            <span key={cat} className={`rounded-md px-2 py-0.5 text-xs capitalize ${marketingTopicPill}`}>
              {cat}
            </span>
          ))}
        </div>
      )}

      {channel.latest_upload_title && (
        <div className={`rounded-lg px-3 py-2.5 ${marketingPanel}`}>
          <p className={`mb-1 text-xs ${marketingTextSubtle}`}>Latest video</p>
          <p className={`line-clamp-1 text-xs font-medium ${marketingTextMuted}`}>
            {channel.latest_upload_title}
          </p>
          {channel.latest_upload_date && (
            <p className={`mt-0.5 text-xs ${marketingTextSubtle}`}>
              {new Date(channel.latest_upload_date).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}

      <div className={`mt-auto flex items-center justify-between text-xs ${marketingTextSubtle}`}>
        <span className="text-red-500/70 dark:text-[#ff4444]/60">youtube.com</span>
        <span className="text-[#146fc2] transition-colors group-hover:text-[#2490ed] dark:text-[#7ec5ff]">
          Visit channel ↗
        </span>
      </div>
    </a>
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

      <MarketingPageShell
        id="main-content"
        innerClassName={`${marketingPageInnerClass} mx-auto max-w-7xl`}
      >
        <HubPageHeader
          eyebrow={
            <>
              <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
              </svg>
              YouTube Directory
            </>
          }
          title="Industry YouTube Channels"
          description="The best YouTube channels for Australian restoration, HVAC, flooring, indoor air quality, and environmental professionals — curated and updated weekly by CARSI."
          meta={
            <>
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
                // GP-431: don't leak an internal "pending API key" status to the
                // public. The channels below are real and curated; only the
                // optional view-count stats sync is unwired, so say nothing about
                // a stats cadence until it is.
                <span>Curated weekly by CARSI</span>
              )}
            </>
          }
        />

        <div className="mb-10">
          <HubCategoryPills basePath="/youtube" categories={CATEGORIES} activeCategory={category} />
        </div>

        {carsiChannels.length > 0 && (
          <div className="mb-10">
            <HubSectionLabel>CARSI Channel</HubSectionLabel>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {carsiChannels.map((c) => (
                <ChannelCard key={c.id} channel={c} />
              ))}
            </div>
          </div>
        )}

        {channels.length === 0 && placeholderCount === 0 ? (
          <HubEmptyState>
            {category
              ? `No channels found in "${category}" — try a different category.`
              : 'Channel data is loading.'}
          </HubEmptyState>
        ) : (
          <>
            {industryChannels.length > 0 && (
              <>
                {carsiChannels.length > 0 && (
                  <HubSectionLabel>Industry Channels</HubSectionLabel>
                )}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {industryChannels.map((c) => (
                    <ChannelCard key={c.id} channel={c} />
                  ))}
                  {Array.from({ length: placeholderCount }, (_, i) => (
                    <HubPlaceholderCard key={`placeholder-${i}`} message="Loading channels..." />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <HubSuggestBanner
          title="Know a channel we should add?"
          description="If you run or follow a great industry YouTube channel that belongs in this directory, let us know."
          href="/contact"
          ctaLabel="Suggest a Channel"
        />
      </MarketingPageShell>
    </>
  );
}
