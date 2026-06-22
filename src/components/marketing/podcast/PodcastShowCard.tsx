import { Mic2, Radio } from 'lucide-react';
import Link from 'next/link';

import {
  marketingPanel,
  marketingPanelHover,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';

export interface PodcastShowData {
  id: string;
  name: string;
  host: string | null;
  description: string | null;
  spotify_url: string | null;
  apple_podcasts_url: string | null;
  youtube_url: string | null;
  amazon_music_url: string | null;
  website_url: string | null;
  episode_count: number | null;
  latest_episode_date: string | null;
  industry_categories: string[];
  country: string;
  featured: boolean;
}

const PLATFORM_STYLES: Record<string, string> = {
  Spotify: 'bg-[#1DB954] text-white',
  Apple: 'bg-[#9933FF] text-white',
  YouTube: 'bg-[#FF0000] text-white',
  Amazon: 'bg-[#FF9900] text-white',
  Website:
    'border border-slate-300/90 bg-slate-50 text-slate-700 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/80',
};

function formatEpisodeDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function PlatformLinks({ show }: { show: PodcastShowData }) {
  const links = [
    show.spotify_url && { label: 'Spotify', href: show.spotify_url },
    show.apple_podcasts_url && { label: 'Apple', href: show.apple_podcasts_url },
    show.youtube_url && { label: 'YouTube', href: show.youtube_url },
    show.amazon_music_url && { label: 'Amazon', href: show.amazon_music_url },
    show.website_url && { label: 'Website', href: show.website_url },
  ].filter(Boolean) as { label: string; href: string }[];

  if (links.length === 0) return null;

  return (
    <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold transition hover:opacity-90 ${PLATFORM_STYLES[link.label] ?? PLATFORM_STYLES.Website}`}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function PodcastCarsiHero({ show }: { show: PodcastShowData }) {
  const latest = formatEpisodeDate(show.latest_episode_date);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#2490ed]/25 bg-gradient-to-br from-[#eef7ff] via-white to-[#f8fbff] p-6 sm:p-8 dark:border-[#2490ed]/30 dark:from-[#2490ed]/14 dark:via-[#0a0f18] dark:to-[#060a14]">
      <div
        className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-[#2490ed]/15 blur-3xl dark:bg-[#2490ed]/25"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#2490ed]/30 bg-[#2490ed]/10 text-[#146fc2] dark:text-[#8fd0ff] sm:h-20 sm:w-20">
          <Mic2 className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#2490ed]/25 bg-[#eef7ff] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#146fc2] uppercase dark:border-[#2490ed]/35 dark:bg-[#2490ed]/15 dark:text-[#8fd0ff]">
              CARSI Original
            </span>
            <span className="rounded-full border border-amber-500/25 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
              Featured
            </span>
          </div>
          <h2 className={`text-xl font-bold leading-snug sm:text-2xl ${marketingTextStrong}`}>{show.name}</h2>
          {show.host ? <p className={`mt-1 text-sm ${marketingTextSubtle}`}>Hosted by {show.host}</p> : null}
          {show.description ? (
            <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${marketingTextMuted}`}>{show.description}</p>
          ) : null}
          <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs ${marketingTextSubtle}`}>
            {show.episode_count != null ? <span>{show.episode_count} episodes</span> : null}
            {latest ? <span>Latest episode {latest}</span> : null}
          </div>
          <PlatformLinks show={show} />
        </div>
      </div>
    </div>
  );
}

export function PodcastShowCard({ show }: { show: PodcastShowData }) {
  const latest = formatEpisodeDate(show.latest_episode_date);

  return (
    <article className={`flex h-full flex-col gap-3 p-5 ${marketingPanel} ${marketingPanelHover}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {show.featured ? (
              <span className="rounded-full border border-amber-500/25 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
                Featured
              </span>
            ) : null}
            <span className={`text-[10px] font-medium tracking-wide uppercase ${marketingTextSubtle}`}>
              {show.country}
            </span>
          </div>
          <h3 className={`text-base font-semibold leading-snug ${marketingTextStrong}`}>{show.name}</h3>
          {show.host ? <p className={`mt-0.5 truncate text-xs ${marketingTextSubtle}`}>{show.host}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-[#146fc2] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#8fd0ff]">
          <Radio className="h-4 w-4" aria-hidden />
        </div>
      </div>

      {show.description ? (
        <p className={`line-clamp-3 text-sm leading-relaxed ${marketingTextMuted}`}>{show.description}</p>
      ) : null}

      <div className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${marketingTextSubtle}`}>
        {show.episode_count != null ? <span>{show.episode_count} episodes</span> : null}
        {latest ? <span>Latest {latest}</span> : null}
      </div>

      {show.industry_categories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {show.industry_categories.slice(0, 3).map((cat) => (
            <span key={cat} className={marketingTopicPill}>
              {cat}
            </span>
          ))}
        </div>
      ) : null}

      <PlatformLinks show={show} />
    </article>
  );
}

export function PodcastPlaceholderCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300/90 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/80 dark:bg-white/[0.06]" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200/60 dark:bg-white/[0.04]" />
      <div className="h-12 w-full animate-pulse rounded-lg bg-slate-200/50 dark:bg-white/[0.03]" />
    </div>
  );
}

export function PodcastCategoryPills({
  categories,
  activeCategory,
  searchQuery,
}: {
  categories: string[];
  activeCategory?: string;
  searchQuery?: string;
}) {
  const baseQuery = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={searchQuery ? `/podcast?q=${encodeURIComponent(searchQuery)}` : '/podcast'}
        className={
          !activeCategory
            ? 'rounded-full bg-[#2490ed] px-4 py-1.5 text-sm font-semibold text-white shadow-sm'
            : marketingTopicPill + ' px-4 py-1.5 transition hover:border-[#2490ed]/35'
        }
      >
        All
      </Link>
      {categories.map((cat) => {
        const href = `/podcast?category=${encodeURIComponent(cat)}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`;
        const active = activeCategory === cat;
        return (
          <Link
            key={cat}
            href={href}
            className={
              active
                ? 'rounded-full bg-[#2490ed] px-4 py-1.5 text-sm font-semibold text-white shadow-sm'
                : marketingTopicPill + ' px-4 py-1.5 transition hover:border-[#2490ed]/35'
            }
          >
            {cat}
          </Link>
        );
      })}
    </div>
  );
}
