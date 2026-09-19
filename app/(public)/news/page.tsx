import type { Metadata } from 'next';

import {
  COMMUNITY_CARD_CLASS,
  CommunityHubShell,
} from '@/components/marketing/hub/CommunityHubShell';
import {
  HubCategoryPills,
  HubEmptyState,
  HubPlaceholderCard,
  HubSectionLabel,
} from '@/components/marketing/hub/HubUi';
import { BreadcrumbSchema, NewsArticleSchema } from '@/components/seo';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import { OG_IMAGES } from '@/lib/seo/og-image';

const siteUrl = getPublicSiteUrl();

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
    images: OG_IMAGES,
    title: 'Industry News | CARSI Hub',
    description:
      'AI-curated news from the Australian restoration, HVAC, flooring, and indoor environment industries.',
    type: 'website',
    url: `${siteUrl}/news`,
  },
  alternates: { canonical: `${siteUrl}/news` },
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
      className={`group flex flex-col gap-3 ${COMMUNITY_CARD_CLASS}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {article.is_featured && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              Featured
            </span>
          )}
          {article.source_name && (
            <span className="text-xs text-slate-400">{article.source_name}</span>
          )}
        </div>
        <span className="text-xs text-slate-400">{timeAgo(article.published_at)}</span>
      </div>

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

      <h2
        className="text-base leading-snug font-semibold text-slate-950 transition-colors group-hover:text-[#146fc2]"
      >
        {title}
      </h2>

      {article.ai_summary && (
        <p className="line-clamp-3 text-sm leading-relaxed text-slate-500">
          {article.ai_summary}
        </p>
      )}

      {article.ai_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.ai_tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-slate-400">
        <span>{article.author ? `By ${article.author}` : ''}</span>
        <span className="text-[#146fc2]/70 transition-colors group-hover:text-[#146fc2] dark:text-[#7ec5ff]/70 dark:group-hover:text-[#7ec5ff]">
          Read article ↗
        </span>
      </div>
    </a>
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
    { name: 'Home', url: siteUrl },
    { name: 'Industry News', url: `${siteUrl}/news` },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      {featuredArticles.slice(0, 5).map((a) => (
        <NewsArticleSchema
          key={a.id}
          headline={a.ai_title ?? a.original_title}
          description={a.ai_summary ?? undefined}
          url={a.source_url}
          image={a.image_url ?? undefined}
          datePublished={a.published_at ?? undefined}
          dateModified={a.published_at ?? undefined}
          authorName={a.author ?? undefined}
          publisherName={a.source_name ?? undefined}
          keywords={a.ai_tags}
        />
      ))}

      <CommunityHubShell
        eyebrow="Community & resources"
        title="Industry News"
        description="AI-curated news from leading trade publications — restoration, HVAC, flooring, indoor air quality, and the broader Australian construction industry."
        stats={[
          { value: total > 0 ? String(total) : 'Live', label: 'Articles' },
          {
            value: last_updated
              ? isToday(last_updated)
                ? 'Today'
                : new Date(last_updated).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                  })
              : '—',
            label: 'Last update',
          },
          { value: 'AU', label: 'Trade press' },
          { value: '24/7', label: 'Feed' },
        ]}
      >
        <div className="mb-10">
          <HubCategoryPills basePath="/news" categories={CATEGORIES} activeCategory={category} />
        </div>

        {featuredArticles.length > 0 && !category ? (
          <section className="mb-10" aria-label="Featured news">
            <HubSectionLabel>Featured</HubSectionLabel>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {featuredArticles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        ) : null}

        {articles.length === 0 && placeholderCount === 0 ? (
          <HubEmptyState>
            {category
              ? `No news in "${category}" yet — the RSS pipeline will populate this shortly.`
              : 'News articles are being ingested. Check back soon.'}
          </HubEmptyState>
        ) : (
          <>
            {(regularArticles.length > 0 || !category) && (
              <>
                {featuredArticles.length > 0 && !category ? (
                  <HubSectionLabel>Latest</HubSectionLabel>
                ) : null}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {(category ? articles : regularArticles).map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                  {Array.from({ length: placeholderCount }, (_, i) => (
                    <HubPlaceholderCard key={`placeholder-${i}`} message="News articles loading..." />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CommunityHubShell>
    </>
  );
}
