import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema, JobPostingSchema } from '@/components/seo';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

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

      <main className="min-h-screen bg-[#050505] px-4 py-16">
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Link
            href="/jobs"
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70"
          >
            ← Back to Jobs
          </Link>

          {/* Title + company */}
          <div className="mb-6">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[rgba(36,144,237,0.12)] px-3 py-1 text-xs font-medium text-[#2490ed]">
                {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
              </span>
              {job.is_remote && (
                <span className="inline-flex items-center rounded-full bg-[rgba(52,211,153,0.12)] px-3 py-1 text-xs font-medium text-[#34d399]">
                  Remote
                </span>
              )}
              {job.featured && (
                <span className="inline-flex items-center rounded-full bg-[rgba(251,191,36,0.12)] px-3 py-1 text-xs font-medium text-[#fbbf24]">
                  Featured
                </span>
              )}
            </div>
            <h1 className="text-3xl leading-tight font-bold text-white md:text-4xl">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-white/60">
              {job.company_website ? (
                <a
                  href={job.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#2490ed] hover:underline"
                >
                  {job.company_name}
                </a>
              ) : (
                <span className="font-medium">{job.company_name}</span>
              )}
              <span className="text-white/25">·</span>
              <span className="text-base">{locationStr}</span>
            </div>
          </div>

          {/* Key details */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="mb-1 text-xs font-medium tracking-wider text-white/30 uppercase">
                Location
              </p>
              <p className="text-base font-semibold text-white/90">{locationStr}</p>
            </div>
            <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="mb-1 text-xs font-medium tracking-wider text-white/30 uppercase">
                Employment Type
              </p>
              <p className="text-base font-semibold text-white/90">
                {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
              </p>
            </div>
            {salary && (
              <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="mb-1 text-xs font-medium tracking-wider text-white/30 uppercase">
                  Salary
                </p>
                <p className="text-base font-semibold text-[#34d399]">{salary}</p>
              </div>
            )}
            <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="mb-1 text-xs font-medium tracking-wider text-white/30 uppercase">
                Listing Expires
              </p>
              <p className="text-base font-semibold text-white/90">
                {new Date(job.valid_through).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Description */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-white/80">About the Role</h2>
            <div className="leading-relaxed whitespace-pre-line text-white/60">
              {job.description}
            </div>
          </section>

          {/* Industry categories */}
          {job.industry_categories.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold tracking-wider text-white/30 uppercase">
                Industry
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.industry_categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/jobs?category=${encodeURIComponent(cat)}`}
                    className="rounded-sm bg-white/[0.05] px-3 py-1 text-sm text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/80"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Apply CTAs */}
          <div className="flex flex-wrap gap-3">
            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm bg-[#2490ed] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Apply Now ↗
              </a>
            )}
            {job.apply_email && (
              <a
                href={`mailto:${job.apply_email}?subject=Application: ${encodeURIComponent(job.title)}`}
                className="rounded-sm border border-[rgba(36,144,237,0.4)] px-6 py-3 text-sm font-semibold text-[#2490ed] transition-colors hover:bg-[rgba(36,144,237,0.08)]"
              >
                Apply via Email
              </a>
            )}
            <Link
              href="/jobs"
              className="rounded-sm border border-white/[0.1] px-6 py-3 text-sm font-semibold text-white/50 transition-colors hover:text-white/80"
            >
              ← All Jobs
            </Link>
          </div>

          {/* Post a job nudge */}
          <div className="mt-12 rounded-sm border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <p className="text-sm font-medium text-white/60">Hiring in the industry?</p>
            <Link
              href="/jobs/submit"
              className="mt-2 inline-block rounded-sm bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.1]"
            >
              Post a Job for Free
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
