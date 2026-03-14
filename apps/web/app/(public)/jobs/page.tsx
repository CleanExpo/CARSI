import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo';

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
    title: 'Jobs | CARSI Industry Hub',
    description: 'Industry jobs across restoration, HVAC, flooring, and indoor environments.',
    type: 'website',
    url: 'https://carsi.com.au/jobs',
  },
  alternates: { canonical: 'https://carsi.com.au/jobs' },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

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
  created_at: string;
}

interface JobListResponse {
  data: JobSummary[];
  total: number;
  limit: number;
  offset: number;
}

async function getJobs(category?: string, state?: string): Promise<JobListResponse> {
  try {
    const params = new URLSearchParams({ limit: '40', offset: '0' });
    if (category) params.set('category', category);
    if (state) params.set('state', state);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/jobs?${params}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { data: [], total: 0, limit: 40, offset: 0 };
    return res.json();
  } catch {
    return { data: [], total: 0, limit: 40, offset: 0 };
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
      className="group flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-200 hover:border-[rgba(36,144,237,0.35)] hover:bg-white/[0.06] hover:shadow-[0_8px_40px_rgba(36,144,237,0.12)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold leading-snug text-white/90 transition-colors group-hover:text-[#2490ed] truncate">
            {job.title}
          </h3>
          <p className="mt-0.5 text-sm text-white/50 truncate">{job.company_name}</p>
        </div>
        {job.featured && (
          <span className="flex-shrink-0 inline-flex items-center rounded-full bg-[rgba(251,191,36,0.12)] px-2 py-0.5 text-xs font-medium text-[#fbbf24]">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/50">
        <span className="inline-flex items-center rounded-md bg-white/[0.06] px-2 py-0.5 text-xs">
          {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${job.is_remote ? 'bg-[#34d399]' : 'bg-white/30'}`} />
          {locationStr}
        </span>
        {salary && <span className="text-[#34d399] font-medium">{salary}</span>}
      </div>

      {job.industry_categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.industry_categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs text-white/35"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      <p className="mt-auto text-xs text-white/25">{timeAgo(job.created_at)}</p>
    </Link>
  );
}

function PlaceholderCard({ index }: { index: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01] p-5">
      <div className="space-y-1.5">
        <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.03]" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 animate-pulse rounded-md bg-white/[0.04]" />
        <div className="h-5 w-20 animate-pulse rounded bg-white/[0.03]" />
      </div>
      <p className="mt-auto text-xs text-white/20">Job slot {index} — positions incoming</p>
    </div>
  );
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; state?: string }>;
}) {
  const { category, state } = await searchParams;
  const { data: jobs, total } = await getJobs(category, state);

  const placeholderCount = Math.max(0, 3 - jobs.length);

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'Jobs', url: 'https://carsi.com.au/jobs' },
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
              Industry Jobs
            </h1>
            <p className="max-w-2xl text-lg text-white/50">
              Jobs across the Australian restoration, HVAC, flooring, and indoor environment
              industries. Posted directly by employers — no recruitment fees.
            </p>
            {total > 0 && (
              <p className="mt-2 text-sm text-white/30">{total} active listings</p>
            )}
          </div>

          {/* Category filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Link
              href={state ? `/jobs?state=${state}` : '/jobs'}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !category
                  ? 'bg-[#2490ed] text-white'
                  : 'border border-white/[0.08] text-white/50 hover:border-[rgba(36,144,237,0.35)] hover:text-white/80'
              }`}
            >
              All Categories
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/jobs?category=${encodeURIComponent(cat)}${state ? `&state=${state}` : ''}`}
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

          {/* State filter */}
          <div className="mb-10 flex flex-wrap gap-2">
            <Link
              href={category ? `/jobs?category=${encodeURIComponent(category)}` : '/jobs'}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !state
                  ? 'bg-white/[0.1] text-white/70'
                  : 'border border-white/[0.06] text-white/40 hover:text-white/70'
              }`}
            >
              All States
            </Link>
            {AU_STATES.map((st) => (
              <Link
                key={st}
                href={`/jobs?${category ? `category=${encodeURIComponent(category)}&` : ''}state=${st}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  state === st
                    ? 'bg-white/[0.1] text-white/70'
                    : 'border border-white/[0.06] text-white/40 hover:text-white/70'
                }`}
              >
                {st}
              </Link>
            ))}
          </div>

          {/* Post a job CTA */}
          <div className="mb-10 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-4">
            <div>
              <p className="text-sm font-medium text-white/80">Hiring in the industry?</p>
              <p className="text-xs text-white/40">
                Post a job for free — reviewed and live within 24 hours. 30-day listing.
              </p>
            </div>
            <Link
              href="/jobs/submit"
              className="rounded-xl bg-[#2490ed] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Post a Job
            </Link>
          </div>

          {/* Listings */}
          {jobs.length === 0 && placeholderCount === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-16 text-center">
              <p className="text-white/40">
                {category || state
                  ? 'No listings match your filters — try a different combination or post a job.'
                  : 'No listings yet — be the first to post a job above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
              {Array.from({ length: placeholderCount }, (_, i) => (
                <PlaceholderCard key={`placeholder-${i}`} index={jobs.length + i + 1} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
