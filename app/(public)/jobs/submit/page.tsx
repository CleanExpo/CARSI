'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarketingPageShell, marketingPageInnerNarrowClass } from '@/components/marketing/MarketingPageShell';
import { getBackendOrigin } from '@/lib/env/public-url';
import {
  marketingBackLink,
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingDivider,
  marketingFilterPillActive,
  marketingFilterPillInactive,
  marketingHeading,
  marketingInput,
  marketingLabel,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
} from '@/lib/marketing/marketing-ui';

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
      <MarketingPageShell
        id="main-content"
        innerClassName={`${marketingPageInnerNarrowClass} mx-auto max-w-2xl text-center`}
      >
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-600 dark:bg-[rgba(52,211,153,0.15)] dark:text-[#34d399]">
          ✓
        </div>
        <h1 className={`mb-3 text-3xl font-bold ${marketingTextStrong}`}>Job Submitted!</h1>
        <p className={`mb-6 text-lg ${marketingTextMuted}`}>
          Your listing is under review. It will appear on the job board within 24 hours.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/jobs" className={marketingBtnPrimary}>
            Browse Jobs
          </Link>
          <Link href="/" className={marketingBtnSecondary}>
            Back to Home
          </Link>
        </div>
      </MarketingPageShell>
    );
  }

  return (
    <MarketingPageShell
      id="main-content"
      innerClassName={`${marketingPageInnerNarrowClass} mx-auto max-w-2xl`}
    >
      <Link href="/jobs" className={`mb-8 ${marketingBackLink}`}>
        ← Back to Jobs
      </Link>

      <div className="mb-10">
        <h1 className={marketingHeading}>Post a Job</h1>
        <p className={`mt-2 ${marketingTextMuted}`}>
          Free listing for 30 days. Reviewed and published within 24 hours.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-5">
          <h2 className={`border-b pb-2 text-lg font-semibold ${marketingDivider} ${marketingTextStrong}`}>
            Job Details
          </h2>

          <div>
            <label className={marketingLabel}>Job Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Water Damage Technician"
              className={marketingInput}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={marketingLabel}>Company Name *</label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => updateField('company_name', e.target.value)}
                placeholder="Your company name"
                className={marketingInput}
              />
            </div>
            <div>
              <label className={marketingLabel}>Company Website</label>
              <input
                type="url"
                value={form.company_website}
                onChange={(e) => updateField('company_website', e.target.value)}
                placeholder="https://yourcompany.com.au"
                className={marketingInput}
              />
            </div>
          </div>

          <div>
            <label className={marketingLabel}>Employment Type *</label>
            <select
              value={form.employment_type}
              onChange={(e) => updateField('employment_type', e.target.value)}
              className={marketingInput}
            >
              {EMPLOYMENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={marketingLabel}>Job Description * (minimum 50 characters)</label>
            <textarea
              required
              minLength={50}
              rows={8}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the role, responsibilities, requirements, and any other relevant details..."
              className={`${marketingInput} h-auto resize-y py-3`}
            />
          </div>
        </section>

        <section className="space-y-5">
          <h2 className={`border-b pb-2 text-lg font-semibold ${marketingDivider} ${marketingTextStrong}`}>
            Location
          </h2>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.is_remote}
              onChange={(e) => updateField('is_remote', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#2490ed] dark:border-white/20"
            />
            <span className={`text-sm ${marketingTextMuted}`}>
              This is a remote / work-from-home role
            </span>
          </label>

          {!form.is_remote && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={marketingLabel}>City</label>
                <input
                  type="text"
                  value={form.location_city}
                  onChange={(e) => updateField('location_city', e.target.value)}
                  placeholder="e.g. Brisbane"
                  className={marketingInput}
                />
              </div>
              <div>
                <label className={marketingLabel}>State</label>
                <select
                  value={form.location_state}
                  onChange={(e) => updateField('location_state', e.target.value)}
                  className={marketingInput}
                >
                  <option value="">Select state</option>
                  {AU_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className={`border-b pb-2 text-lg font-semibold ${marketingDivider} ${marketingTextStrong}`}>
            Industry Categories
            <span className={`ml-2 text-sm font-normal ${marketingTextSubtle}`}>(select up to 5)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={
                  form.industry_categories.includes(cat)
                    ? marketingFilterPillActive
                    : marketingFilterPillInactive
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <h2 className={`border-b pb-2 text-lg font-semibold ${marketingDivider} ${marketingTextStrong}`}>
            Salary (optional)
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={marketingLabel}>Minimum (AUD per annum)</label>
              <input
                type="number"
                min="0"
                value={form.salary_min}
                onChange={(e) => updateField('salary_min', e.target.value)}
                placeholder="e.g. 65000"
                className={marketingInput}
              />
            </div>
            <div>
              <label className={marketingLabel}>Maximum (AUD per annum)</label>
              <input
                type="number"
                min="0"
                value={form.salary_max}
                onChange={(e) => updateField('salary_max', e.target.value)}
                placeholder="e.g. 85000"
                className={marketingInput}
              />
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className={`border-b pb-2 text-lg font-semibold ${marketingDivider} ${marketingTextStrong}`}>
            How to Apply
            <span className={`ml-2 text-sm font-normal ${marketingTextSubtle}`}>
              (at least one required)
            </span>
          </h2>
          <div>
            <label className={marketingLabel}>Application URL</label>
            <input
              type="url"
              value={form.apply_url}
              onChange={(e) => updateField('apply_url', e.target.value)}
              placeholder="https://yourcompany.com.au/careers/apply"
              className={marketingInput}
            />
          </div>
          <div>
            <label className={marketingLabel}>Application Email</label>
            <input
              type="email"
              value={form.apply_email}
              onChange={(e) => updateField('apply_email', e.target.value)}
              placeholder="careers@yourcompany.com.au"
              className={marketingInput}
            />
          </div>
        </section>

        <section className="space-y-5">
          <h2 className={`border-b pb-2 text-lg font-semibold ${marketingDivider} ${marketingTextStrong}`}>
            Your Contact Details
            <span className={`ml-2 text-sm font-normal ${marketingTextSubtle}`}>(not published)</span>
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={marketingLabel}>Your Name *</label>
              <input
                type="text"
                required
                value={form.submitter_name}
                onChange={(e) => updateField('submitter_name', e.target.value)}
                placeholder="Full name"
                className={marketingInput}
              />
            </div>
            <div>
              <label className={marketingLabel}>Your Email *</label>
              <input
                type="email"
                required
                value={form.submitter_email}
                onChange={(e) => updateField('submitter_email', e.target.value)}
                placeholder="you@company.com.au"
                className={marketingInput}
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-4 text-base disabled:cursor-not-allowed disabled:opacity-50 ${marketingBtnPrimary}`}
        >
          {submitting ? 'Submitting...' : 'Submit Job Listing'}
        </button>

        <p className={`text-center text-xs ${marketingTextSubtle}`}>
          By submitting, you confirm this listing is accurate and you have authority to post on
          behalf of the company. Listings expire after 30 days.
        </p>
      </form>
    </MarketingPageShell>
  );
}
