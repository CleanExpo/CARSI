import type { Metadata } from 'next';
import Link from 'next/link';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import {
  HubCategoryPills,
  HubEmptyState,
  HubPageHeader,
  HubPlaceholderCard,
} from '@/components/marketing/hub/HubUi';
import { BreadcrumbSchema } from '@/components/seo';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import {
  marketingEyebrowPill,
  marketingHubCard,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';
import { OG_IMAGES } from '@/lib/seo/og-image';

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: 'Research Articles | CARSI Industry Hub',
  description:
    'Deep, sourced research articles on water damage restoration, indoor environments, HVAC, flooring, and related Australian industries. Expert content from NRPG-accredited professionals.',
  keywords: [
    'restoration research',
    'water damage articles',
    'indoor environment research',
    'HVAC industry',
    'flooring industry Australia',
    'CARSI research hub',
    'NRPG articles',
  ],
  openGraph: {
    images: OG_IMAGES,
    title: 'Research Articles | CARSI Industry Hub',
    description:
      'Expert research and analysis on the Australian restoration, indoor environment, and HVAC industries.',
    type: 'website',
    url: `${siteUrl}/research`,
  },
  alternates: { canonical: `${siteUrl}/research` },
};

const BACKEND_URL = getBackendOrigin();

const CATEGORIES = [
  'Water Damage',
  'Mould & Remediation',
  'Fire Restoration',
  'Indoor Air Quality',
  'HVAC',
  'Flooring',
  'Building & Construction',
  'Insurance & Claims',
  'Standards & Compliance',
  'Technology',
];

interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  author_name: string | null;
  status: string;
  published_at: string | null;
  view_count: number;
  created_at: string;
}

interface ArticleListResponse {
  data: ArticleSummary[];
  total: number;
  limit: number;
  offset: number;
}

async function getArticles(category?: string): Promise<ArticleListResponse> {
  try {
    const params = new URLSearchParams({ limit: '20', offset: '0' });
    if (category) params.set('category', category);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/articles?${params}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { data: [], total: 0, limit: 20, offset: 0 };
    return res.json();
  } catch {
    return { data: [], total: 0, limit: 20, offset: 0 };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <Link href={`/research/${article.slug}`} className={`group flex flex-col gap-3 p-6 ${marketingHubCard}`}>
      {article.category && (
        <span className="inline-flex w-fit items-center rounded-full border border-[#2490ed]/25 bg-[#eef7ff] px-3 py-1 text-xs font-medium text-[#146fc2] dark:border-[#2490ed]/30 dark:bg-[#2490ed]/10 dark:text-[#7ec5ff]">
          {article.category}
        </span>
      )}
      <h2
        className={`text-lg leading-snug font-semibold transition-colors group-hover:text-[#146fc2] dark:group-hover:text-[#7ec5ff] ${marketingTextStrong}`}
      >
        {article.title}
      </h2>
      {article.excerpt && (
        <p className={`line-clamp-3 text-sm leading-relaxed ${marketingTextMuted}`}>{article.excerpt}</p>
      )}
      <div className={`mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${marketingTextSubtle}`}>
        {article.author_name && <span>By {article.author_name}</span>}
        {article.published_at && <span>{formatDate(article.published_at)}</span>}
        {article.view_count > 0 && <span>{article.view_count.toLocaleString('en-AU')} views</span>}
      </div>
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.tags.slice(0, 4).map((tag) => (
            <span key={tag} className={marketingTopicPill}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const { data: articles, total } = await getArticles(category);

  const placeholderCount = Math.max(0, 10 - articles.length);

  const breadcrumbs = [
    { name: 'Home', url: siteUrl },
    { name: 'Research', url: `${siteUrl}/research` },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      <MarketingPageShell id="main-content">
        <HubPageHeader
          eyebrow={
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[#2490ed]" aria-hidden />
              CARSI Industry Hub
            </>
          }
          eyebrowClassName={marketingEyebrowPill}
          title="Research Articles"
          description="Deep, sourced research on water damage restoration, indoor environments, HVAC, flooring, and related Australian industries — authored by NRPG-accredited professionals."
          meta={total > 0 ? <span>{total} articles published</span> : undefined}
        />

        <div className="mb-10">
          <HubCategoryPills basePath="/research" categories={CATEGORIES} activeCategory={category} />
        </div>

        {articles.length === 0 && placeholderCount === 0 ? (
          <HubEmptyState>
            {category
              ? `No articles in "${category}" yet — check back soon.`
              : 'Research articles are on their way. Check back soon.'}
          </HubEmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            {Array.from({ length: placeholderCount }, (_, i) => (
              <HubPlaceholderCard
                key={`placeholder-${i}`}
                message={`Article slot ${articles.length + i + 1} — content incoming`}
              />
            ))}
          </div>
        )}
      </MarketingPageShell>
    </>
  );
}
