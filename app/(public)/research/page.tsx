import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo';
import { getBackendOrigin } from '@/lib/env/public-url';

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
    title: 'Research Articles | CARSI Industry Hub',
    description:
      'Expert research and analysis on the Australian restoration, indoor environment, and HVAC industries.',
    type: 'website',
    url: 'https://carsi.com.au/research',
  },
  alternates: { canonical: 'https://carsi.com.au/research' },
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
    <Link
      href={`/research/${article.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-200 hover:border-[rgba(36,144,237,0.35)] hover:bg-white/[0.06] hover:shadow-[0_8px_40px_rgba(36,144,237,0.12)]"
    >
      {article.category && (
        <span className="inline-flex w-fit items-center rounded-full bg-[rgba(36,144,237,0.12)] px-3 py-1 text-xs font-medium text-[#2490ed]">
          {article.category}
        </span>
      )}
      <h2 className="text-lg leading-snug font-semibold text-white/90 transition-colors group-hover:text-[#2490ed]">
        {article.title}
      </h2>
      {article.excerpt && (
        <p className="line-clamp-3 text-sm leading-relaxed text-white/50">{article.excerpt}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/30">
        {article.author_name && <span>By {article.author_name}</span>}
        {article.published_at && <span>{formatDate(article.published_at)}</span>}
        {article.view_count > 0 && <span>{article.view_count.toLocaleString('en-AU')} views</span>}
      </div>
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-white/40"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

// Placeholder card for empty slots (10 reserved for COO content hand-off)
function PlaceholderCard({ index }: { index: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01] p-6">
      <div className="h-5 w-24 animate-pulse rounded bg-white/[0.05]" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-white/[0.05]" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-white/[0.03]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.03]" />
      </div>
      <p className="mt-auto text-xs text-white/20">Article slot {index} — content incoming</p>
    </div>
  );
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const { data: articles, total } = await getArticles(category);

  // Show 10 placeholder slots if fewer than 10 published articles
  const placeholderCount = Math.max(0, 10 - articles.length);

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'Research', url: 'https://carsi.com.au/research' },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="min-h-screen bg-[#050505] px-4 py-16">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[rgba(36,144,237,0.1)] px-4 py-1.5 text-sm font-medium text-[#2490ed]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2490ed]" />
              CARSI Industry Hub
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Research Articles
            </h1>
            <p className="max-w-2xl text-lg text-white/50">
              Deep, sourced research on water damage restoration, indoor environments, HVAC,
              flooring, and related Australian industries — authored by NRPG-accredited
              professionals.
            </p>
            {total > 0 && <p className="mt-2 text-sm text-white/30">{total} articles published</p>}
          </div>

          {/* Category filter */}
          <div className="mb-10 flex flex-wrap gap-2">
            <Link
              href="/research"
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
                href={`/research?category=${encodeURIComponent(cat)}`}
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

          {/* Articles grid */}
          {articles.length === 0 && placeholderCount === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-16 text-center">
              <p className="text-white/40">
                {category
                  ? `No articles in "${category}" yet — check back soon.`
                  : 'Research articles are on their way. Check back soon.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
              {Array.from({ length: placeholderCount }, (_, i) => (
                <PlaceholderCard key={`placeholder-${i}`} index={articles.length + i + 1} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
