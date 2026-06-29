import type { Metadata } from 'next';
import Link from 'next/link';
import { Headphones, Plus } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  PodcastCarsiHero,
  PodcastCategoryPills,
  PodcastPlaceholderCard,
  PodcastShowCard,
  type PodcastShowData,
} from '@/components/marketing/podcast/PodcastShowCard';
import { BreadcrumbSchema, PodcastSeriesSchema } from '@/components/seo';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import {
  marketingBtnSecondary,
  marketingEyebrowPill,
  marketingHeading,
  marketingPanel,
  marketingTextMuted,
  marketingTextSubtle,
} from '@/lib/marketing/marketing-ui';
import { OG_IMAGES } from '@/lib/seo/og-image';

const siteUrl = getPublicSiteUrl();

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
    images: OG_IMAGES,
    title: 'Podcast Directory | CARSI Industry Hub',
    description:
      'The best podcasts for Australian restoration, HVAC, flooring, and indoor environment professionals — curated by CARSI.',
    type: 'website',
    url: `${siteUrl}/podcast`,
  },
  alternates: { canonical: `${siteUrl}/podcast` },
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
  'Insurance & Claims',
  'Asthma & Chronic Illness',
  'Building & Construction',
];

interface PodcastShow extends PodcastShowData {
  slug: string;
  rss_url: string | null;
  is_carsi_show: boolean;
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
    { name: 'Home', url: siteUrl },
    { name: 'Podcast Directory', url: `${siteUrl}/podcast` },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      {carsiShow ? (
        <PodcastSeriesSchema
          name={carsiShow.name}
          description={carsiShow.description ?? undefined}
          url={`${siteUrl}/podcast`}
          author="CARSI"
          rssUrl={carsiShow.rss_url ?? undefined}
        />
      ) : null}
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

      <MarketingPageShell id="main-content">
        <header className="pb-8 sm:pb-10">
          <p className={`mb-4 inline-flex items-center gap-2 ${marketingEyebrowPill}`}>
            <Headphones className="h-3.5 w-3.5" aria-hidden />
            CARSI Industry Hub
          </p>
          <h1 className={marketingHeading}>Podcast directory</h1>
          <p className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${marketingTextMuted}`}>
            The best podcasts for Australian restoration, HVAC, flooring, and indoor environment
            professionals — curated by CARSI.
          </p>
          {total > 0 ? (
            <p className={`mt-2 text-sm ${marketingTextSubtle}`}>{total} podcasts catalogued</p>
          ) : null}
        </header>

        <div className="mb-8">
          <PodcastCategoryPills categories={CATEGORIES} activeCategory={category} searchQuery={q} />
        </div>

        {q ? (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <p className={`text-sm ${marketingTextMuted}`}>
              Results for <span className="font-medium text-slate-800 dark:text-white/85">&quot;{q}&quot;</span>
            </p>
            <Link
              href={category ? `/podcast?category=${encodeURIComponent(category)}` : '/podcast'}
              className="text-xs text-[#146fc2] underline-offset-2 hover:underline dark:text-[#8fd0ff]"
            >
              Clear search
            </Link>
          </div>
        ) : null}

        {carsiShow && !category && !q ? (
          <section className="mb-12" aria-label="CARSI original podcast">
            <MarketingSectionHeader
              eyebrow="CARSI production"
              title="Our flagship show"
              pill={false}
              className="mb-5"
            />
            <PodcastCarsiHero show={carsiShow} />
          </section>
        ) : null}

        <section aria-label="Industry podcast directory">
          {!category && !q ? (
            <MarketingSectionHeader
              eyebrow="Industry directory"
              title="Podcasts for restoration pros"
              body="Filter by category or browse the full catalogue."
              pill={false}
              className="mb-6"
            />
          ) : null}

          {industryShows.length === 0 && placeholderCount === 0 ? (
            <div className={`p-12 text-center sm:p-16 ${marketingPanel}`}>
              <p className={marketingTextMuted}>
                {category || q
                  ? 'No podcasts match your filters. Try a different category or search term.'
                  : 'No podcasts listed yet — check back soon.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {industryShows.map((show) => (
                <PodcastShowCard key={show.id} show={show} />
              ))}
              {Array.from({ length: placeholderCount }, (_, i) => (
                <PodcastPlaceholderCard key={`placeholder-${i}`} />
              ))}
            </div>
          )}
        </section>

        <section
          className={`mt-12 flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between ${marketingPanel}`}
          aria-label="Submit a podcast"
        >
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-white/90">
              Know a podcast we should list?
            </p>
            <p className={`mt-1 text-sm ${marketingTextMuted}`}>
              Submit industry podcasts for review — free to list for indoor environment professionals.
            </p>
          </div>
          <Link href="/contact" className={`inline-flex shrink-0 items-center gap-2 ${marketingBtnSecondary}`}>
            <Plus className="h-4 w-4" aria-hidden />
            Submit podcast
          </Link>
        </section>
      </MarketingPageShell>
    </>
  );
}
