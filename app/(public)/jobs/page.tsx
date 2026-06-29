import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo';
import { MarketingPageShell, marketingPageInnerClass } from '@/components/marketing/MarketingPageShell';
import {
  HubCategoryPills,
  HubCtaBanner,
  HubEmptyState,
  HubPageHeader,
  HubPlaceholderCard,
  HubSecondaryPills,
} from '@/components/marketing/hub/HubUi';
import { getBackendOrigin } from '@/lib/env/public-url';
import {
  marketingBtnSecondary,
  marketingFilterPillActive,
  marketingFilterPillInactive,
  marketingHubCard,
  marketingTextStrong,
  marketingTextMuted,
  marketingTextSubtle,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';
import { OG_IMAGES } from '@/lib/seo/og-image';

export const metadata: Metadata = {
  title: 'Jobs | CARSI Industry Hub',
  description:
    'Browse jobs in the Australian restoration, HVAC, flooring, and indoor environment industries. Full-time, part-time, and contractor roles across all states.',
  keywords: [
    'restoration jobs Australia',
    'HVAC jobs',
    'flooring industry jobs',
    'water damage technician jobs',
    'indoor hygienist jobs',
    'building restoration careers',
    'CARSI job board',
  ],
  openGraph: {
    images: OG_IMAGES,
    title: 'Jobs | CARSI Industry Hub',
    description: 'Industry jobs across restoration, HVAC, flooring, and indoor environments.',
    type: 'website',
    url: 'https://carsi.com.au/jobs',
  },
  alternates: { canonical: 'https://carsi.com.au/jobs' },
};

const BACKEND_URL = getBackendOrigin();

const AU_STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
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
];

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-Time',
  PART_TIME: 'Part-Time',
  CONTRACTOR: 'Contractor',
  CASUAL: 'Casual',
  INTERNSHIP: 'Internship',
};

interface JobSummary {
  id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  employment_type: string;
  industry_categories: string[];
  location_city: string | null;
  location_state: string | null;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  valid_through: string;
  featured: boolean;
  source: string;
  apply_url: string | null;
  created_at: string;
}

interface JobListResponse {
  data: JobSummary[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 24;

async function getJobs(category?: string, state?: string, page = 1): Promise<JobListResponse> {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (category) params.set('category', category);
    if (state) params.set('state', state);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/jobs?${params}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { data: [], total: 0, limit: PAGE_SIZE, offset };
    return res.json();
  } catch {
    return { data: [], total: 0, limit: PAGE_SIZE, offset: 0 };
  }
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n.toLocaleString('en-AU')}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} pa`;
  if (min) return `from ${fmt(min)} pa`;
  return `up to ${fmt(max!)} pa`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function JobCard({ job }: { job: JobSummary }) {
  const salary = formatSalary(job.salary_min, job.salary_max);
  const locationStr = job.is_remote
    ? 'Remote'
    : [job.location_city, job.location_state].filter(Boolean).join(', ') || 'Australia';

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`group flex flex-col gap-3 p-5 ${marketingHubCard}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className={`truncate text-base leading-snug font-semibold transition-colors group-hover:text-[#2490ed] ${marketingTextStrong}`}
          >
            {job.title}
          </h3>
          <p className={`mt-0.5 truncate text-sm ${marketingTextMuted}`}>{job.company_name}</p>
        </div>
        {job.featured && (
          <span className="inline-flex flex-shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-[rgba(251,191,36,0.12)] dark:text-[#fbbf24]">
            Featured
          </span>
        )}
      </div>

      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm ${marketingTextMuted}`}>
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${marketingTopicPill}`}>
          {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${job.is_remote ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-white/30'}`}
          />
          {locationStr}
        </span>
        {salary && <span className="font-medium text-emerald-700 dark:text-[#34d399]">{salary}</span>}
      </div>

      {job.industry_categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.industry_categories.slice(0, 3).map((cat) => (
            <span key={cat} className={`rounded-md px-2 py-0.5 text-xs ${marketingTopicPill}`}>
              {cat}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <p className={`text-xs ${marketingTextSubtle}`}>{timeAgo(job.created_at)}</p>
        <div className="flex items-center gap-2">
          {job.source !== 'manual' && (
            <span className={`text-xs capitalize ${marketingTextSubtle}`}>via {job.source}</span>
          )}
          {job.apply_url ? (
            <span className="text-xs font-medium text-[#146fc2] transition-colors group-hover:text-[#2490ed] dark:text-[#7ec5ff]">
              Apply ↗
            </span>
          ) : (
            <span className={`text-xs ${marketingTextSubtle}`}>View →</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; state?: string; page?: string }>;
}) {
  const { category, state, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
  const { data: jobs, total } = await getJobs(category, state, page);

  const placeholderCount = Math.max(0, 3 - jobs.length);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildPageUrl(p: number) {
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (state) qs.set('state', state);
    if (p > 1) qs.set('page', String(p));
    const str = qs.toString();
    return str ? `/jobs?${str}` : '/jobs';
  }

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'Jobs', url: 'https://carsi.com.au/jobs' },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      <MarketingPageShell
        id="main-content"
        innerClassName={`${marketingPageInnerClass} mx-auto max-w-7xl`}
      >
        <HubPageHeader
          eyebrow={
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[#2490ed]" />
              CARSI Industry Hub
            </>
          }
          title="Industry Jobs"
          description="Jobs across the Australian restoration, HVAC, flooring, and indoor environment industries. Posted directly by employers — no recruitment fees."
          meta={total > 0 ? <span>{total} active listings</span> : undefined}
        />

        <div className="mb-4">
          <HubCategoryPills
            basePath="/jobs"
            categories={CATEGORIES}
            activeCategory={category}
            queryParams={{ state }}
            allLabel="All Categories"
          />
        </div>

        <div className="mb-10">
          <HubSecondaryPills
            items={AU_STATES.map((st) => ({ value: st, label: st }))}
            activeValue={state}
            allLabel="All States"
            buildHref={(value) => {
              const params = new URLSearchParams();
              if (category) params.set('category', category);
              if (value) params.set('state', value);
              const qs = params.toString();
              return qs ? `/jobs?${qs}` : '/jobs';
            }}
          />
        </div>

        <HubCtaBanner
          title="Hiring in the industry?"
          description="Post a job for free — reviewed and live within 24 hours. 30-day listing."
          href="/jobs/submit"
          ctaLabel="Post a Job"
        />

        {jobs.length === 0 && placeholderCount === 0 ? (
          <HubEmptyState>
            {category || state
              ? 'No listings match your filters — try a different combination or post a job.'
              : 'No listings yet — be the first to post a job above.'}
          </HubEmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            {Array.from({ length: placeholderCount }, (_, i) => (
              <HubPlaceholderCard
                key={`placeholder-${i}`}
                message={`Job slot ${jobs.length + i + 1} — positions incoming`}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
            {page > 1 && (
              <Link href={buildPageUrl(page - 1)} className={marketingBtnSecondary}>
                ← Previous
              </Link>
            )}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className={`px-2 ${marketingTextSubtle}`}>
                      …
                    </span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageUrl(p as number)}
                      className={`min-w-[36px] rounded-xl px-3 py-2 text-center text-sm transition-colors ${
                        p === page ? marketingFilterPillActive : marketingFilterPillInactive
                      }`}
                    >
                      {p}
                    </Link>
                  )
                )}
            </div>
            {page < totalPages && (
              <Link href={buildPageUrl(page + 1)} className={marketingBtnSecondary}>
                Next →
              </Link>
            )}
          </nav>
        )}
      </MarketingPageShell>
    </>
  );
}
