import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema, JobPostingSchema } from '@/components/seo';
import {
  MarketingPageShell,
  marketingPageInnerNarrowClass,
} from '@/components/marketing/MarketingPageShell';
import { HubSuggestBanner } from '@/components/marketing/hub/HubUi';
import { getBackendOrigin } from '@/lib/env/public-url';
import {
  marketingBackLink,
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingHubSectionLabel,
  marketingLink,
  marketingMetaCard,
  marketingMetaLabel,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';

const BACKEND_URL = getBackendOrigin();

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-Time',
  PART_TIME: 'Part-Time',
  CONTRACTOR: 'Contractor',
  CASUAL: 'Casual',
  INTERNSHIP: 'Internship',
};

interface JobDetail {
  id: string;
  title: string;
  company_name: string;
  company_website: string | null;
  company_logo_url: string | null;
  description: string;
  employment_type: string;
  industry_categories: string[];
  location_city: string | null;
  location_state: string | null;
  location_postcode: string | null;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  apply_url: string | null;
  apply_email: string | null;
  valid_through: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

async function getJob(id: string): Promise<JobDetail | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/jobs/${id}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return { title: 'Job Not Found | CARSI Hub' };

  const location = job.is_remote
    ? 'Remote'
    : [job.location_city, job.location_state].filter(Boolean).join(', ') || 'Australia';

  const description = `${EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type} role at ${job.company_name} — ${location}. ${job.description.slice(0, 100)}...`;

  return {
    title: `${job.title} at ${job.company_name} | CARSI Jobs`,
    description: description.slice(0, 155),
    openGraph: {
      title: `${job.title} — ${job.company_name}`,
      description: description.slice(0, 155),
      type: 'website',
      url: `https://carsi.com.au/jobs/${job.id}`,
    },
    alternates: { canonical: `https://carsi.com.au/jobs/${job.id}` },
  };
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${n.toLocaleString('en-AU')}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} per annum`;
  if (min) return `from ${fmt(min)} per annum`;
  return `up to ${fmt(max!)} per annum`;
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) notFound();

  const locationStr = job.is_remote
    ? 'Remote — Australia-wide'
    : [job.location_city, job.location_state, job.location_postcode].filter(Boolean).join(', ') ||
      'Australia';

  const salary = formatSalary(job.salary_min, job.salary_max);

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'Jobs', url: 'https://carsi.com.au/jobs' },
    { name: job.title, url: `https://carsi.com.au/jobs/${job.id}` },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <JobPostingSchema
        title={job.title}
        description={job.description}
        companyName={job.company_name}
        companyUrl={job.company_website ?? undefined}
        datePosted={job.created_at}
        validThrough={job.valid_through}
        employmentType={job.employment_type}
        locationCity={job.location_city ?? undefined}
        locationState={job.location_state ?? undefined}
        isRemote={job.is_remote}
        salaryMin={job.salary_min ?? undefined}
        salaryMax={job.salary_max ?? undefined}
        applyUrl={job.apply_url ?? undefined}
      />

      <MarketingPageShell
        id="main-content"
        innerClassName={`${marketingPageInnerNarrowClass} mx-auto max-w-3xl`}
      >
        <Link href="/jobs" className={`mb-8 ${marketingBackLink}`}>
          ← Back to Jobs
        </Link>

        <div className="mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#eef7ff] px-3 py-1 text-xs font-medium text-[#146fc2] dark:bg-[rgba(36,144,237,0.12)] dark:text-[#2490ed]">
              {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
            </span>
            {job.is_remote && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-[rgba(52,211,153,0.12)] dark:text-[#34d399]">
                Remote
              </span>
            )}
            {job.featured && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-[rgba(251,191,36,0.12)] dark:text-[#fbbf24]">
                Featured
              </span>
            )}
          </div>
          <h1 className={`text-3xl leading-tight font-bold md:text-4xl ${marketingTextStrong}`}>
            {job.title}
          </h1>
          <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg ${marketingTextMuted}`}>
            {job.company_website ? (
              <a
                href={job.company_website}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-medium ${marketingLink}`}
              >
                {job.company_name}
              </a>
            ) : (
              <span className="font-medium">{job.company_name}</span>
            )}
            <span className={marketingTextSubtle}>·</span>
            <span className="text-base">{locationStr}</span>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={marketingMetaCard}>
            <p className={marketingMetaLabel}>Location</p>
            <p className={`text-base font-semibold ${marketingTextStrong}`}>{locationStr}</p>
          </div>
          <div className={marketingMetaCard}>
            <p className={marketingMetaLabel}>Employment Type</p>
            <p className={`text-base font-semibold ${marketingTextStrong}`}>
              {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
            </p>
          </div>
          {salary && (
            <div className={marketingMetaCard}>
              <p className={marketingMetaLabel}>Salary</p>
              <p className="text-base font-semibold text-emerald-700 dark:text-[#34d399]">{salary}</p>
            </div>
          )}
          <div className={marketingMetaCard}>
            <p className={marketingMetaLabel}>Listing Expires</p>
            <p className={`text-base font-semibold ${marketingTextStrong}`}>
              {new Date(job.valid_through).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className={`mb-3 text-lg font-semibold ${marketingTextStrong}`}>About the Role</h2>
          <div className={`leading-relaxed whitespace-pre-line ${marketingTextMuted}`}>
            {job.description}
          </div>
        </section>

        {job.industry_categories.length > 0 && (
          <section className="mb-8">
            <h2 className={marketingHubSectionLabel}>Industry</h2>
            <div className="flex flex-wrap gap-2">
              {job.industry_categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/jobs?category=${encodeURIComponent(cat)}`}
                  className={`px-3 py-1 text-sm transition-colors hover:border-[#2490ed]/35 ${marketingTopicPill}`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          {job.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className={marketingBtnPrimary}
            >
              Apply Now ↗
            </a>
          )}
          {job.apply_email && (
            <a
              href={`mailto:${job.apply_email}?subject=Application: ${encodeURIComponent(job.title)}`}
              className={marketingBtnSecondary}
            >
              Apply via Email
            </a>
          )}
          <Link href="/jobs" className={marketingBtnSecondary}>
            ← All Jobs
          </Link>
        </div>

        <HubSuggestBanner
          title="Hiring in the industry?"
          description="Post a job listing for free — reviewed and published within 24 hours."
          href="/jobs/submit"
          ctaLabel="Post a Job for Free"
        />
      </MarketingPageShell>
    </>
  );
}
