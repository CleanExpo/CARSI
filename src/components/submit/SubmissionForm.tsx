'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SubmissionFormProps {
  submissionType: string;
  urlLabel: string;
}

interface FormState {
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string;
  submitter_company: string;
  submitter_role: string;
  submission_title: string;
  submission_url: string;
  submission_description: string;
  terms_accepted: boolean;
  guidelines_accepted: boolean;
}

const INITIAL_STATE: FormState = {
  submitter_name: '',
  submitter_email: '',
  submitter_phone: '',
  submitter_company: '',
  submitter_role: '',
  submission_title: '',
  submission_url: '',
  submission_description: '',
  terms_accepted: false,
  guidelines_accepted: false,
};

const fieldStyle =
  'w-full rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/85 placeholder:text-white/25 outline-none transition-colors focus:border-[rgba(0,245,255,0.35)] focus:bg-white/[0.05]';

const labelStyle = 'block mb-1.5 text-xs font-medium text-white/55';

export function SubmissionForm({ submissionType, urlLabel }: SubmissionFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.submitter_name.trim()) next.submitter_name = 'Your name is required.';
    if (!form.submitter_email.trim()) {
      next.submitter_email = 'Your email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.submitter_email)) {
      next.submitter_email = 'Please enter a valid email address.';
    }
    if (!form.submission_title.trim())
      next.submission_title = 'A title for your submission is required.';
    if (!form.terms_accepted) next.terms_accepted = 'You must accept the terms and conditions.';
    if (!form.guidelines_accepted)
      next.guidelines_accepted = 'You must confirm you have read the submission guidelines.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, submission_type: submissionType }),
      });

      const json = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !json.success) {
        setServerError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      router.push(`/submit/${submissionType}/success`);
    } catch {
      setServerError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="rounded-sm border-[0.5px] border-white/[0.06] bg-white/[0.02] p-6 md:p-8">
        <h2 className="mb-6 text-sm font-semibold tracking-wider text-white/40 uppercase">
          Your Details
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Submitter name */}
          <div>
            <label htmlFor="submitter_name" className={labelStyle}>
              Full Name <span className="text-[#00F5FF]/70">*</span>
            </label>
            <input
              id="submitter_name"
              type="text"
              className={fieldStyle}
              placeholder="Jane Smith"
              value={form.submitter_name}
              onChange={(e) => setField('submitter_name', e.target.value)}
              autoComplete="name"
              aria-invalid={!!errors.submitter_name}
            />
            {errors.submitter_name && (
              <p className="mt-1.5 text-xs text-red-400">{errors.submitter_name}</p>
            )}
          </div>

          {/* Submitter email */}
          <div>
            <label htmlFor="submitter_email" className={labelStyle}>
              Email Address <span className="text-[#00F5FF]/70">*</span>
            </label>
            <input
              id="submitter_email"
              type="email"
              className={fieldStyle}
              placeholder="jane@example.com.au"
              value={form.submitter_email}
              onChange={(e) => setField('submitter_email', e.target.value)}
              autoComplete="email"
              aria-invalid={!!errors.submitter_email}
            />
            {errors.submitter_email && (
              <p className="mt-1.5 text-xs text-red-400">{errors.submitter_email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="submitter_phone" className={labelStyle}>
              Phone Number
            </label>
            <input
              id="submitter_phone"
              type="tel"
              className={fieldStyle}
              placeholder="0400 000 000"
              value={form.submitter_phone}
              onChange={(e) => setField('submitter_phone', e.target.value)}
              autoComplete="tel"
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="submitter_company" className={labelStyle}>
              Company / Organisation
            </label>
            <input
              id="submitter_company"
              type="text"
              className={fieldStyle}
              placeholder="ACME Restoration Pty Ltd"
              value={form.submitter_company}
              onChange={(e) => setField('submitter_company', e.target.value)}
              autoComplete="organization"
            />
          </div>

          {/* Role */}
          <div className="sm:col-span-2">
            <label htmlFor="submitter_role" className={labelStyle}>
              Your Role / Title
            </label>
            <input
              id="submitter_role"
              type="text"
              className={fieldStyle}
              placeholder="e.g. Owner, Technician, Content Creator"
              value={form.submitter_role}
              onChange={(e) => setField('submitter_role', e.target.value)}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="my-7 border-t border-white/[0.05]" />

        <h2 className="mb-6 text-sm font-semibold tracking-wider text-white/40 uppercase">
          Submission Details
        </h2>

        <div className="flex flex-col gap-5">
          {/* Title */}
          <div>
            <label htmlFor="submission_title" className={labelStyle}>
              Title <span className="text-[#00F5FF]/70">*</span>
            </label>
            <input
              id="submission_title"
              type="text"
              className={fieldStyle}
              placeholder="Name of the podcast, channel, event, or resource"
              value={form.submission_title}
              onChange={(e) => setField('submission_title', e.target.value)}
              aria-invalid={!!errors.submission_title}
            />
            {errors.submission_title && (
              <p className="mt-1.5 text-xs text-red-400">{errors.submission_title}</p>
            )}
          </div>

          {/* URL */}
          <div>
            <label htmlFor="submission_url" className={labelStyle}>
              {urlLabel}
            </label>
            <input
              id="submission_url"
              type="url"
              className={fieldStyle}
              placeholder="https://"
              value={form.submission_url}
              onChange={(e) => setField('submission_url', e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="submission_description" className={labelStyle}>
              Description
            </label>
            <textarea
              id="submission_description"
              rows={4}
              className={`${fieldStyle} resize-none`}
              placeholder="Briefly describe the submission and why it should be listed in the CARSI Hub."
              value={form.submission_description}
              onChange={(e) => setField('submission_description', e.target.value)}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="my-7 border-t border-white/[0.05]" />

        {/* Agreements */}
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer items-start gap-3">
            <span className="mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.guidelines_accepted}
                onChange={(e) => setField('guidelines_accepted', e.target.checked)}
                aria-invalid={!!errors.guidelines_accepted}
              />
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${
                  form.guidelines_accepted
                    ? 'border-[#00F5FF] bg-[rgba(0,245,255,0.15)]'
                    : errors.guidelines_accepted
                      ? 'border-red-500/60 bg-white/[0.02]'
                      : 'border-white/20 bg-white/[0.02]'
                }`}
                aria-hidden="true"
              >
                {form.guidelines_accepted && (
                  <svg
                    className="h-2.5 w-2.5 text-[#00F5FF]"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </span>
            <span className="text-xs leading-relaxed text-white/50">
              I have read and agree to the submission guidelines above.{' '}
              <span className="text-[#00F5FF]/70">*</span>
            </span>
          </label>
          {errors.guidelines_accepted && (
            <p className="-mt-2 ml-7 text-xs text-red-400">{errors.guidelines_accepted}</p>
          )}

          <label className="flex cursor-pointer items-start gap-3">
            <span className="mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.terms_accepted}
                onChange={(e) => setField('terms_accepted', e.target.checked)}
                aria-invalid={!!errors.terms_accepted}
              />
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${
                  form.terms_accepted
                    ? 'border-[#00F5FF] bg-[rgba(0,245,255,0.15)]'
                    : errors.terms_accepted
                      ? 'border-red-500/60 bg-white/[0.02]'
                      : 'border-white/20 bg-white/[0.02]'
                }`}
                aria-hidden="true"
              >
                {form.terms_accepted && (
                  <svg
                    className="h-2.5 w-2.5 text-[#00F5FF]"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </span>
            <span className="text-xs leading-relaxed text-white/50">
              I confirm that the information provided is accurate and I authorise CARSI to publish
              this listing in the Hub directory. I understand that CARSI reserves the right to
              decline or remove submissions at its discretion.{' '}
              <span className="text-[#00F5FF]/70">*</span>
            </span>
          </label>
          {errors.terms_accepted && (
            <p className="-mt-2 ml-7 text-xs text-red-400">{errors.terms_accepted}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="mt-6 rounded-sm border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-xs text-red-400">
            {serverError}
          </div>
        )}

        {/* Submit */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: submitting ? 'rgba(0,245,255,0.08)' : 'rgba(0,245,255,0.12)',
              border: '0.5px solid rgba(0,245,255,0.3)',
              color: '#00F5FF',
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,245,255,0.18)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,245,255,0.12)';
            }}
          >
            {submitting ? (
              <>
                <svg
                  className="h-3.5 w-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting…
              </>
            ) : (
              'Submit for Review →'
            )}
          </button>
          <p className="mt-3 text-xs text-white/25">We aim to respond within 5 business days.</p>
        </div>
      </div>
    </form>
  );
}
