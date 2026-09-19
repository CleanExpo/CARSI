import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import {
  PodcastCarsiHero,
  PodcastCategoryPills,
  PodcastPlaceholderCard,
  PodcastShowCard,
  type PodcastShowData,
} from '@/components/marketing/podcast/PodcastShowCard';
import { BreadcrumbSchema, PodcastSeriesSchema } from '@/components/seo';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
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

      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_80%_0%,rgba(36,144,237,0.11),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <p className={LANDING_EYEBROW_CLASS}>CARSI Industry Hub</p>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
            Podcast directory
          </h1>
          <p className={`mt-5 max-w-2xl text-pretty ${LANDING_LEAD_CLASS}`}>
            The best podcasts for Australian restoration, HVAC, flooring, and indoor environment
            professionals — curated by CARSI.
          </p>
          <PlatformNav current="/podcast" />
        </div>
      </section>

      <HomeTrustStrip
        stats={[
          { value: total > 0 ? String(total) : '—', label: 'Shows listed' },
          { value: String(CATEGORIES.length), label: 'Topics' },
          { value: 'AU', label: 'Industry focus' },
          { value: '24/7', label: 'Listen anytime' },
        ]}
      />

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-10">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <PodcastCategoryPills categories={CATEGORIES} activeCategory={category} searchQuery={q} />
          {q ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-500">
                Results for <span className="font-medium text-slate-800">&quot;{q}&quot;</span>
              </p>
              <Link
                href={category ? `/podcast?category=${encodeURIComponent(category)}` : '/podcast'}
                className="text-xs text-[#146fc2] underline-offset-2 hover:underline"
              >
                Clear search
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {carsiShow && !category && !q ? (
        <section className="border-t border-slate-200/70 bg-white py-16 md:py-24" aria-label="CARSI original podcast">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>CARSI production</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Our flagship show</h2>
            <div className="mt-10">
              <PodcastCarsiHero show={carsiShow} />
            </div>
          </div>
        </section>
      ) : null}

      <section
        className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
        aria-label="Industry podcast directory"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          {!category && !q ? (
            <>
              <p className={LANDING_EYEBROW_CLASS}>Industry directory</p>
              <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Podcasts for restoration pros</h2>
              <p className={`mt-4 max-w-xl ${LANDING_LEAD_CLASS}`}>
                Filter by category or browse the full catalogue.
              </p>
            </>
          ) : null}

          {industryShows.length === 0 && placeholderCount === 0 ? (
            <div className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
              <p className="text-sm text-slate-500">
                {category || q
                  ? 'No podcasts match your filters. Try a different category or search term.'
                  : 'No podcasts listed yet — check back soon.'}
              </p>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {industryShows.map((show) => (
                <PodcastShowCard key={show.id} show={show} />
              ))}
              {Array.from({ length: placeholderCount }, (_, i) => (
                <PodcastPlaceholderCard key={`placeholder-${i}`} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        className="border-t border-slate-200/70 bg-white py-16"
        aria-label="Submit a podcast"
      >
        <div className={`${PUBLIC_SHELL_INNER_CLASS} flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 sm:flex-row sm:items-center sm:justify-between`}>
          <div>
            <p className="text-base font-semibold text-slate-950">Know a podcast we should list?</p>
            <p className="mt-1 text-sm text-slate-500">
              Submit industry podcasts for review — free to list for indoor environment professionals.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/40 hover:text-[#146fc2]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Submit podcast
          </Link>
        </div>
      </section>

      <HomeFinalCtaSection />
    </>
  );
}
