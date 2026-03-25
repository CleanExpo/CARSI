'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getBackendOrigin } from '@/lib/env/public-url';

const BACKEND_URL = getBackendOrigin();

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const AU_STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

const INDUSTRY_CATEGORIES = [
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

interface FormState {
  title: string;
  company_name: string;
  company_website: string;
  description: string;
  employment_type: string;
  industry_categories: string[];
  location_city: string;
  location_state: string;
  is_remote: boolean;
  salary_min: string;
  salary_max: string;
  apply_url: string;
  apply_email: string;
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string;
}

const INITIAL_STATE: FormState = {
  title: '',
  company_name: '',
  company_website: '',
  description: '',
  employment_type: 'FULL_TIME',
  industry_categories: [],
  location_city: '',
  location_state: '',
  is_remote: false,
  salary_min: '',
  salary_max: '',
  apply_url: '',
  apply_email: '',
  submitter_name: '',
  submitter_email: '',
  submitter_phone: '',
};

export default function SubmitJobPage() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      industry_categories: prev.industry_categories.includes(cat)
        ? prev.industry_categories.filter((c) => c !== cat)
        : prev.industry_categories.length < 5
          ? [...prev.industry_categories, cat]
          : prev.industry_categories,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!form.apply_url && !form.apply_email) {
      setError('Please provide either an application URL or email address.');
      setSubmitting(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        company_name: form.company_name.trim(),
        description: form.description.trim(),
        employment_type: form.employment_type,
        industry_categories: form.industry_categories,
        is_remote: form.is_remote,
        submitter_name: form.submitter_name.trim(),
        submitter_email: form.submitter_email.trim(),
      };

      if (form.company_website.trim()) payload.company_website = form.company_website.trim();
      if (form.location_city.trim()) payload.location_city = form.location_city.trim();
      if (form.location_state) payload.location_state = form.location_state;
      if (form.salary_min) payload.salary_min = parseInt(form.salary_min, 10);
      if (form.salary_max) payload.salary_max = parseInt(form.salary_max, 10);
      if (form.apply_url.trim()) payload.apply_url = form.apply_url.trim();
      if (form.apply_email.trim()) payload.apply_email = form.apply_email.trim();
      if (form.submitter_phone.trim()) payload.submitter_phone = form.submitter_phone.trim();

      const res = await fetch(`${BACKEND_URL}/api/jobs/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? 'Submission failed. Please try again.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(52,211,153,0.15)] text-4xl text-[#34d399]">
            ✓
          </div>
          <h1 className="mb-3 text-3xl font-bold text-white">Job Submitted!</h1>
          <p className="mb-6 text-lg text-white/50">
            Your listing is under review. It will appear on the job board within 24 hours.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/jobs"
              className="rounded-xl bg-[#2490ed] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Browse Jobs
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-white/[0.1] px-6 py-3 text-sm font-semibold text-white/50 transition-colors hover:text-white/80"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[rgba(36,144,237,0.5)] focus:outline-none focus:ring-1 focus:ring-[rgba(36,144,237,0.25)]';
  const labelClass = 'mb-1.5 block text-sm font-medium text-white/70';

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/jobs"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70"
        >
          ← Back to Jobs
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Post a Job</h1>
          <p className="mt-2 text-white/50">
            Free listing for 30 days. Reviewed and published within 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Job details */}
          <section className="space-y-5">
            <h2 className="border-b border-white/[0.06] pb-2 text-lg font-semibold text-white/80">
              Job Details
            </h2>

            <div>
              <label className={labelClass}>Job Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Water Damage Technician"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={form.company_name}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  placeholder="Your company name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Company Website</label>
                <input
                  type="url"
                  value={form.company_website}
                  onChange={(e) => updateField('company_website', e.target.value)}
                  placeholder="https://yourcompany.com.au"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Employment Type *</label>
              <select
                value={form.employment_type}
                onChange={(e) => updateField('employment_type', e.target.value)}
                className={inputClass}
              >
                {EMPLOYMENT_TYPES.map((et) => (
                  <option key={et.value} value={et.value} className="bg-[#111]">
                    {et.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Job Description * (minimum 50 characters)</label>
              <textarea
                required
                minLength={50}
                rows={8}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the role, responsibilities, requirements, and any other relevant details..."
                className={`${inputClass} resize-y`}
              />
            </div>
          </section>

          {/* Location */}
          <section className="space-y-5">
            <h2 className="border-b border-white/[0.06] pb-2 text-lg font-semibold text-white/80">
              Location
            </h2>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_remote}
                onChange={(e) => updateField('is_remote', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-[#2490ed]"
              />
              <span className="text-sm text-white/70">This is a remote / work-from-home role</span>
            </label>

            {!form.is_remote && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={form.location_city}
                    onChange={(e) => updateField('location_city', e.target.value)}
                    placeholder="e.g. Brisbane"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select
                    value={form.location_state}
                    onChange={(e) => updateField('location_state', e.target.value)}
                    className={inputClass}
                  >
                    <option value="" className="bg-[#111]">
                      Select state
                    </option>
                    {AU_STATES.map((st) => (
                      <option key={st} value={st} className="bg-[#111]">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* Industry categories */}
          <section className="space-y-4">
            <h2 className="border-b border-white/[0.06] pb-2 text-lg font-semibold text-white/80">
              Industry Categories
              <span className="ml-2 text-sm font-normal text-white/30">(select up to 5)</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    form.industry_categories.includes(cat)
                      ? 'bg-[#2490ed] text-white'
                      : 'border border-white/[0.1] text-white/50 hover:border-[rgba(36,144,237,0.35)] hover:text-white/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* Salary */}
          <section className="space-y-5">
            <h2 className="border-b border-white/[0.06] pb-2 text-lg font-semibold text-white/80">
              Salary (optional)
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Minimum (AUD per annum)</label>
                <input
                  type="number"
                  min="0"
                  value={form.salary_min}
                  onChange={(e) => updateField('salary_min', e.target.value)}
                  placeholder="e.g. 65000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Maximum (AUD per annum)</label>
                <input
                  type="number"
                  min="0"
                  value={form.salary_max}
                  onChange={(e) => updateField('salary_max', e.target.value)}
                  placeholder="e.g. 85000"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Application */}
          <section className="space-y-5">
            <h2 className="border-b border-white/[0.06] pb-2 text-lg font-semibold text-white/80">
              How to Apply
              <span className="ml-2 text-sm font-normal text-white/30">
                (at least one required)
              </span>
            </h2>
            <div>
              <label className={labelClass}>Application URL</label>
              <input
                type="url"
                value={form.apply_url}
                onChange={(e) => updateField('apply_url', e.target.value)}
                placeholder="https://yourcompany.com.au/careers/apply"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Application Email</label>
              <input
                type="email"
                value={form.apply_email}
                onChange={(e) => updateField('apply_email', e.target.value)}
                placeholder="careers@yourcompany.com.au"
                className={inputClass}
              />
            </div>
          </section>

          {/* Submitter contact */}
          <section className="space-y-5">
            <h2 className="border-b border-white/[0.06] pb-2 text-lg font-semibold text-white/80">
              Your Contact Details
              <span className="ml-2 text-sm font-normal text-white/30">(not published)</span>
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Your Name *</label>
                <input
                  type="text"
                  required
                  value={form.submitter_name}
                  onChange={(e) => updateField('submitter_name', e.target.value)}
                  placeholder="Full name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Your Email *</label>
                <input
                  type="email"
                  required
                  value={form.submitter_email}
                  onChange={(e) => updateField('submitter_email', e.target.value)}
                  placeholder="you@company.com.au"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#2490ed] py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Job Listing'}
          </button>

          <p className="text-center text-xs text-white/30">
            By submitting, you confirm this listing is accurate and you have authority to post on
            behalf of the company. Listings expire after 30 days.
          </p>
        </form>
      </div>
    </main>
  );
}
