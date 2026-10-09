'use client';

import { Globe2, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  CoachingFormSection,
  CoachingSelectField,
  CoachingTextArea,
  CoachingTextField,
} from '@/components/coaching-portal/coaching-form-primitives';
import {
  coachingCard,
  coachingEyebrow,
  coachingMuted,
  coachingPage,
  coachingPrimaryBtn,
  coachingProgressFill,
  coachingProgressFillStyle,
  coachingProgressTrackClass,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import {
  COACHING_BUSINESS_SIZE_OPTIONS,
  COACHING_INDUSTRY_OPTIONS,
  COACHING_SOCIAL_FIELDS,
  COACHING_YEARS_OPTIONS,
  coachingProfileCompletionPercent,
  coachingProfileMeetsRequired,
  EMPTY_COACHING_BUSINESS_PROFILE,
  profileFromApiRow,
  type CoachingBusinessProfileForm,
} from '@/lib/coaching-portal/business-profile';

export function CoachingOnboardingProfileForm() {
  const { access } = useCoachingPortal();
  const [form, setForm] = useState<CoachingBusinessProfileForm>(EMPTY_COACHING_BUSINESS_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const completion = useMemo(() => coachingProfileCompletionPercent(form), [form]);
  const meetsRequired = useMemo(() => coachingProfileMeetsRequired(form), [form]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/coaching/portal/profile');
        const data = (await res.json()) as { profile?: Record<string, string | null> };
        if (data.profile) {
          setForm(profileFromApiRow(data.profile));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function patch<K extends keyof CoachingBusinessProfileForm>(
    key: K,
    value: CoachingBusinessProfileForm[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(markComplete: boolean) {
    if (!access.canEdit) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/coaching/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, markComplete }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setError(data.detail ?? 'Could not save.');
        return;
      }
      setSaved(true);
    } catch {
      setError('Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const disabled = !access.canEdit || loading;

  return (
    <div className={coachingPage}>
      <Link href="/coaching" className="text-sm text-sky-400 transition-colors hover:text-sky-300">
        ← Home
      </Link>

      <header className="mt-5 mb-8">
        <p className={coachingEyebrow}>Onboarding</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
          Business profile
        </h1>
        <p className={`mt-2 max-w-2xl ${coachingMuted}`}>
          A clear picture of your business — including where you show up online — helps Phill tailor
          your coaching plan and growth recommendations.
        </p>

        <div className="mt-6 max-w-md">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Profile completeness</span>
            <span className="font-medium text-slate-300">{completion}%</span>
          </div>
          <div
            className={`mt-2 ${coachingProgressTrackClass()}`}
            role="progressbar"
            aria-valuenow={completion}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={coachingProgressFill} style={coachingProgressFillStyle(completion)} />
          </div>
        </div>
      </header>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save(true);
        }}
      >
        <div className={coachingCard}>
          <CoachingFormSection
            title="Core details"
            description="The basics we use on your workspace and in session prep."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <CoachingTextField
                label="Business name"
                required
                value={form.businessName}
                disabled={disabled}
                onChange={(v) => patch('businessName', v)}
              />
              <CoachingSelectField
                label="Industry"
                required
                value={form.industry}
                disabled={disabled}
                options={COACHING_INDUSTRY_OPTIONS}
                onChange={(v) => patch('industry', v)}
              />
              <CoachingTextField
                label="Location (city / region)"
                required
                value={form.location}
                disabled={disabled}
                onChange={(v) => patch('location', v)}
              />
              <CoachingTextField
                label="Service areas"
                value={form.serviceAreas}
                disabled={disabled}
                placeholder="e.g. Northern suburbs, 50km radius"
                onChange={(v) => patch('serviceAreas', v)}
              />
              <CoachingSelectField
                label="Years in business"
                value={form.yearsInBusiness}
                disabled={disabled}
                options={COACHING_YEARS_OPTIONS}
                onChange={(v) => patch('yearsInBusiness', v)}
              />
              <CoachingSelectField
                label="Business size"
                value={form.businessSize}
                disabled={disabled}
                options={COACHING_BUSINESS_SIZE_OPTIONS}
                onChange={(v) => patch('businessSize', v)}
              />
              <CoachingTextField
                label="Number of employees"
                value={form.employeeCount}
                disabled={disabled}
                onChange={(v) => patch('employeeCount', v)}
              />
            </div>
            <CoachingTextArea
              label="Main services"
              required
              rows={4}
              value={form.mainServices}
              disabled={disabled}
              placeholder="What you sell, who you serve, and what makes you different."
              onChange={(v) => patch('mainServices', v)}
            />
          </CoachingFormSection>
        </div>

        <div className={coachingCard}>
          <CoachingFormSection
            title="Web & social presence"
            description="Paste links to profiles you use today. Skip any you do not have — you can add them later."
          >
            <div className="mb-1 flex items-center gap-2 text-sky-400/90">
              <Globe2 className="h-4 w-4" aria-hidden />
              <span className="text-xs font-medium tracking-wider uppercase">Public profiles</span>
            </div>
            <CoachingTextField
              label="Website"
              type="url"
              value={form.website}
              disabled={disabled}
              placeholder="https://yourbusiness.com.au"
              onChange={(v) => patch('website', v)}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {COACHING_SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                <CoachingTextField
                  key={key}
                  label={label}
                  type="url"
                  value={form[key]}
                  disabled={disabled}
                  placeholder={placeholder}
                  onChange={(v) => patch(key, v)}
                />
              ))}
            </div>
            <CoachingTextArea
              label="Other listings or notes"
              rows={3}
              value={form.socialNotes}
              disabled={disabled}
              placeholder="Yelp, Houzz, directories, or anything else we should know."
              onChange={(v) => patch('socialNotes', v)}
            />
          </CoachingFormSection>
        </div>

        <div className={coachingCard}>
          <CoachingFormSection
            title="Goals & challenges"
            description="Plain English is perfect — this stays between you and the coaching team."
          >
            <CoachingTextArea
              label="Current challenges"
              required
              rows={4}
              value={form.challenges}
              disabled={disabled}
              onChange={(v) => patch('challenges', v)}
            />
            <CoachingTextArea
              label="Short-term goals (next 12 months)"
              required
              rows={4}
              value={form.shortTermGoals}
              disabled={disabled}
              onChange={(v) => patch('shortTermGoals', v)}
            />
            <CoachingTextArea
              label="Long-term vision"
              rows={4}
              value={form.longTermVision}
              disabled={disabled}
              onChange={(v) => patch('longTermVision', v)}
            />
          </CoachingFormSection>
        </div>

        {!access.canEdit ? (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            Staff preview — saving is disabled.
          </p>
        ) : null}

        {!meetsRequired && access.canEdit ? (
          <p className={`flex items-start gap-2 text-sm ${coachingMuted}`}>
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-400/80" aria-hidden />
            Complete the required fields (marked with *) to mark this step done, or save a draft
            anytime.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pb-8">
          <button
            type="button"
            disabled={saving || disabled}
            className={coachingSecondaryBtn}
            onClick={() => void save(false)}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save draft
          </button>
          <button type="submit" disabled={saving || disabled} className={coachingPrimaryBtn}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save & mark complete
          </button>
          <Link href="/coaching/onboarding/assessment" className={coachingSecondaryBtn}>
            Next: Assessment
          </Link>
        </div>
        {saved ? (
          <p className="text-sm font-medium text-emerald-400/95">
            Saved — your profile is up to date.
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </form>
    </div>
  );
}
