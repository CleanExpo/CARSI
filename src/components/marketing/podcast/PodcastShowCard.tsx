import { Mic2, Radio } from 'lucide-react';
import Link from 'next/link';

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
  Website: 'border border-slate-200 bg-slate-50 text-slate-700',
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
    <div className="rounded-2xl border border-[#146fc2] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-[#fafbfc] text-[#146fc2] sm:h-20 sm:w-20">
          <Mic2 className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#146fc2] bg-[#146fc2] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
              CARSI Original
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
              Featured
            </span>
          </div>
          <h2 className="text-xl font-semibold leading-snug text-slate-950 sm:text-2xl">{show.name}</h2>
          {show.host ? <p className="mt-1 text-sm text-slate-500">Hosted by {show.host}</p> : null}
          {show.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{show.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
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
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {show.featured ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                Featured
              </span>
            ) : null}
            <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
              {show.country}
            </span>
          </div>
          <h3 className="text-base font-semibold leading-snug text-slate-950">{show.name}</h3>
          {show.host ? <p className="mt-0.5 truncate text-xs text-slate-500">{show.host}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-[#fafbfc] text-[#146fc2]">
          <Radio className="h-4 w-4" aria-hidden />
        </div>
      </div>

      {show.description ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{show.description}</p>
      ) : null}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
        {show.episode_count != null ? <span>{show.episode_count} episodes</span> : null}
        {latest ? <span>Latest {latest}</span> : null}
      </div>

      {show.industry_categories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {show.industry_categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600"
            >
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
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      <div className="h-12 w-full animate-pulse rounded-lg bg-slate-50" />
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
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={searchQuery ? `/podcast?q=${encodeURIComponent(searchQuery)}` : '/podcast'}
        className={
          !activeCategory
            ? 'rounded-full bg-[#146fc2] px-4 py-1.5 text-sm font-semibold text-white'
            : 'rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-600 hover:border-[#2490ed]/40 hover:text-[#146fc2]'
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
                ? 'rounded-full bg-[#146fc2] px-4 py-1.5 text-sm font-semibold text-white'
                : 'rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-600 hover:border-[#2490ed]/40 hover:text-[#146fc2]'
            }
          >
            {cat}
          </Link>
        );
      })}
    </div>
  );
}
