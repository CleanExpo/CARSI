import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, NewsArticleSchema } from '@/components/seo';
import { getBackendOrigin } from '@/lib/env/public-url';

export const metadata: Metadata = {
  title: 'Industry News | CARSI Hub',
  description:
    'AI-curated news and updates from the Australian restoration, HVAC, flooring, and indoor environment industries. Sourced from leading trade publications.',
  keywords: [
    'restoration industry news',
    'HVAC news Australia',
    'flooring industry updates',
    'water damage news',
    'indoor air quality news',
    'CARSI news feed',
    'disaster recovery Australia',
  ],
  openGraph: {
    title: 'Industry News | CARSI Hub',
    description:
      'AI-curated news from the Australian restoration, HVAC, flooring, and indoor environment industries.',
    type: 'website',
    url: 'https://carsi.com.au/news',
  },
  alternates: { canonical: 'https://carsi.com.au/news' },
};

const BACKEND_URL = getBackendOrigin();

const CATEGORIES = [
  'Restoration',
  'HVAC',
  'Flooring',
  'Indoor Air Quality',
  'Water Damage',
  'Mould Remediation',
  'Carpet & Upholstery Cleaning',
  'Insurance & Claims',
  'Building & Construction',
  'Pest Control',
  'Standards & Compliance',
];

interface NewsArticle {
  id: string;
  source_name: string | null;
  original_title: string;
  ai_title: string | null;
  ai_summary: string | null;
  ai_tags: string[];
  industry_categories: string[];
  source_url: string;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  is_featured: boolean;
  created_at: string;
}

interface NewsListResponse {
  data: NewsArticle[];
  total: number;
  limit: number;
  offset: number;
  last_updated: string | null;
}

async function getNews(category?: string): Promise<NewsListResponse> {
  try {
    const params = new URLSearchParams({ limit: '30', offset: '0' });
    if (category) params.set('category', category);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/news?${params}`, {
      next: { revalidate: 900 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { data: [], total: 0, limit: 30, offset: 0, last_updated: null };
    return res.json();
  } catch {
    return { data: [], total: 0, limit: 30, offset: 0, last_updated: null };
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  const title = article.ai_title ?? article.original_title;
  return (
    <a
      href={article.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-200 hover:border-[rgba(36,144,237,0.35)] hover:bg-white/[0.06] hover:shadow-[0_8px_40px_rgba(36,144,237,0.12)]"
    >
      {/* Featured badge + source */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {article.is_featured && (
            <span className="inline-flex items-center rounded-full bg-[rgba(234,179,8,0.15)] px-2.5 py-0.5 text-xs font-medium text-yellow-400">
              Featured
            </span>
          )}
          {article.source_name && (
            <span className="text-xs text-white/30">{article.source_name}</span>
          )}
        </div>
        <span className="text-xs text-white/25">{timeAgo(article.published_at)}</span>
      </div>

      {/* Image */}
      {article.image_url && (
        <div className="overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image_url}
            alt={title}
            className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      {/* Title */}
      <h2 className="text-base leading-snug font-semibold text-white/90 transition-colors group-hover:text-[#2490ed]">
        {title}
      </h2>

      {/* AI summary */}
      {article.ai_summary && (
        <p className="line-clamp-3 text-sm leading-relaxed text-white/50">{article.ai_summary}</p>
      )}

      {/* Tags */}
      {article.ai_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.ai_tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-white/40"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between text-xs text-white/25">
        <span>{article.author ? `By ${article.author}` : ''}</span>
        <span className="flex items-center gap-1 text-[#2490ed]/60 transition-colors group-hover:text-[#2490ed]">
          Read article ↗
        </span>
      </div>
    </a>
  );
}

function PlaceholderCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01] p-6">
      <div className="h-4 w-20 animate-pulse rounded bg-white/[0.05]" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-white/[0.05]" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-white/[0.03]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.03]" />
      </div>
      <p className="mt-auto text-xs text-white/20">News articles loading...</p>
    </div>
  );
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const { data: articles, total, last_updated } = await getNews(category);

  const placeholderCount = articles.length === 0 ? 3 : 0;

  const featuredArticles = articles.filter((a) => a.is_featured);
  const regularArticles = articles.filter((a) => !a.is_featured);

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'Industry News', url: 'https://carsi.com.au/news' },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Inject NewsArticle schema for featured articles */}
      {featuredArticles.slice(0, 5).map((a) => (
        <NewsArticleSchema
          key={a.id}
          headline={a.ai_title ?? a.original_title}
          description={a.ai_summary ?? undefined}
          url={a.source_url}
          image={a.image_url ?? undefined}
          datePublished={a.published_at ?? undefined}
          authorName={a.author ?? undefined}
          publisherName={a.source_name ?? undefined}
          keywords={a.ai_tags}
        />
      ))}

      <main className="min-h-screen bg-[#050505] px-4 py-16">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[rgba(36,144,237,0.1)] px-4 py-1.5 text-sm font-medium text-[#2490ed]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2490ed]" />
              Live Feed
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Industry News
            </h1>
            <p className="max-w-2xl text-lg text-white/50">
              AI-curated news from leading trade publications — restoration, HVAC, flooring, indoor
              air quality, and the broader Australian construction industry.
            </p>
            <div className="mt-3 flex items-center gap-4 text-sm text-white/30">
              {total > 0 && <span>{total} articles</span>}
              {last_updated && (
                <span>
                  Updated{' '}
                  {isToday(last_updated)
                    ? 'today'
                    : new Date(last_updated).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                </span>
              )}
            </div>
          </div>

          {/* Category filter */}
          <div className="mb-10 flex flex-wrap gap-2">
            <Link
              href="/news"
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
                href={`/news?category=${encodeURIComponent(cat)}`}
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

          {/* Featured row */}
          {featuredArticles.length > 0 && !category && (
            <div className="mb-10">
              <h2 className="mb-4 text-sm font-semibold tracking-widest text-white/30 uppercase">
                Featured
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {featuredArticles.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          )}

          {/* All articles grid */}
          {articles.length === 0 && placeholderCount === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-16 text-center">
              <p className="text-white/40">
                {category
                  ? `No news in "${category}" yet — the RSS pipeline will populate this shortly.`
                  : 'News articles are being ingested. Check back soon.'}
              </p>
            </div>
          ) : (
            <>
              {(regularArticles.length > 0 || !category) && (
                <>
                  {featuredArticles.length > 0 && !category && (
                    <h2 className="mb-4 text-sm font-semibold tracking-widest text-white/30 uppercase">
                      Latest
                    </h2>
                  )}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {(category ? articles : regularArticles).map((article) => (
                      <NewsCard key={article.id} article={article} />
                    ))}
                    {Array.from({ length: placeholderCount }, (_, i) => (
                      <PlaceholderCard key={`placeholder-${i}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
