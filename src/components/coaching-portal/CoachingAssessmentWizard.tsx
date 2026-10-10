'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { coachingFieldClass } from '@/components/coaching-portal/coaching-form-primitives';
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
  COACHING_ASSESSMENT_SECTIONS,
  emptyAssessmentResponses,
  type AssessmentField,
  type AssessmentResponses,
} from '@/lib/coaching-portal/assessment-schema';

function sectionCompletion(sectionId: string, responses: AssessmentResponses): number {
  const section = COACHING_ASSESSMENT_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return 0;
  const required = section.fields.filter((f) => !f.optional);
  if (required.length === 0) return 100;
  const filled = required.filter((f) => (responses[f.id] ?? '').trim().length > 0).length;
  return Math.round((filled / required.length) * 100);
}

function AssessmentFieldControl({
  field,
  value,
  readOnly,
  onChange,
}: {
  field: AssessmentField;
  value: string;
  readOnly: boolean;
  onChange: (v: string) => void;
}) {
  const inputType = field.type === 'url' ? 'url' : 'text';

  if (field.type === 'select') {
    return (
      <select
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={coachingFieldClass}
      >
        <option value="">Select…</option>
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        disabled={readOnly}
        rows={4}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={coachingFieldClass}
      />
    );
  }

  return (
    <input
      type={inputType}
      value={value}
      disabled={readOnly}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={coachingFieldClass}
    />
  );
}

export function CoachingAssessmentWizard() {
  const { access, assessment } = useCoachingPortal();
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<AssessmentResponses>(emptyAssessmentResponses());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const readOnly =
    !access.canEdit || assessment.status === 'submitted' || assessment.status === 'reviewed';

  const section = COACHING_ASSESSMENT_SECTIONS[step];
  const total = COACHING_ASSESSMENT_SECTIONS.length;
  const overallProgress = useMemo(() => {
    const perSection = COACHING_ASSESSMENT_SECTIONS.map((s) => sectionCompletion(s.id, responses));
    return Math.round(perSection.reduce((a, b) => a + b, 0) / perSection.length);
  }, [responses]);
  const stepProgress = useMemo(
    () => sectionCompletion(section.id, responses),
    [section.id, responses]
  );

  const load = useCallback(async () => {
    const res = await fetch('/api/coaching/portal/assessment');
    const data = (await res.json()) as {
      draft?: { responses: AssessmentResponses };
      submitted?: { responses: AssessmentResponses; status: string };
    };
    if (data.submitted) {
      setResponses(data.submitted.responses);
      setSubmitted(true);
    } else if (data.draft) {
      setResponses({ ...emptyAssessmentResponses(), ...data.draft.responses });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function persistResponses(next: AssessmentResponses) {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/coaching/portal/assessment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(data.detail ?? 'Could not save.');
      }
    } catch {
      setError('Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    const nextStep = Math.min(step + 1, total - 1);
    await persistResponses(responses);
    setStep(nextStep);
  }

  async function submitAll() {
    await persistResponses(responses);
    setSaving(true);
    try {
      const res = await fetch('/api/coaching/portal/assessment', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setError(data.detail ?? 'Could not submit.');
        return;
      }
      setSubmitted(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={`${coachingPage} flex justify-center py-20`}>
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className={coachingPage}>
      <Link href="/coaching" className="text-sm text-sky-400 transition-colors hover:text-sky-300">
        ← Home
      </Link>

      <header className="mt-5 mb-8">
        <p className={coachingEyebrow}>Onboarding</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
          Business assessment
        </h1>
        <p className={`mt-2 max-w-2xl ${coachingMuted}`}>
          {readOnly
            ? 'Your submitted answers (read-only).'
            : 'Answer in plain English — we save as you go. The marketing step includes your social links.'}
        </p>
        {!submitted ? (
          <div className="mt-6 max-w-md">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>Overall progress</span>
              <span className="font-medium text-slate-300">{overallProgress}%</span>
            </div>
            <div className={`mt-2 ${coachingProgressTrackClass()}`}>
              <div
                className={coachingProgressFill}
                style={coachingProgressFillStyle(overallProgress)}
              />
            </div>
          </div>
        ) : null}
      </header>

      {submitted ? (
        <div className={coachingCard}>
          <p className="font-medium text-white">Thank you — your assessment has been submitted.</p>
          <p className={`mt-2 ${coachingMuted}`}>
            Phill will review your answers and follow up by email.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/coaching/onboarding/submit" className={coachingPrimaryBtn}>
              Next: Send to Phill
            </Link>
            <Link href="/coaching" className={coachingSecondaryBtn}>
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <div className={coachingCard}>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-sky-400/90">
                Step {step + 1} of {total}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
                {section.title}
              </h2>
              <p className={`mt-1 max-w-xl ${coachingMuted}`}>{section.description}</p>
            </div>
            <div className="w-full max-w-[140px] sm:w-36">
              <p className="text-[11px] text-slate-500">This section</p>
              <div className={`mt-1.5 ${coachingProgressTrackClass()}`}>
                <div
                  className={coachingProgressFill}
                  style={coachingProgressFillStyle(stepProgress)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {section.fields.map((field) => (
              <label key={field.id} className="block">
                <span className="text-xs font-medium text-slate-400">
                  {field.label}
                  {field.optional ? (
                    <span className="font-normal text-slate-600"> (optional)</span>
                  ) : (
                    <span className="text-sky-400/90"> *</span>
                  )}
                </span>
                <div className="mt-0.5">
                  <AssessmentFieldControl
                    field={field}
                    value={responses[field.id] ?? ''}
                    readOnly={readOnly}
                    onChange={(v) => setResponses((r) => ({ ...r, [field.id]: v }))}
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {COACHING_ASSESSMENT_SECTIONS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  i === step
                    ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30'
                    : 'bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300'
                }`}
                onClick={() => setStep(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-white/[0.06] pt-6">
            <button
              type="button"
              disabled={step === 0 || saving}
              className={coachingSecondaryBtn}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            {step < total - 1 ? (
              <button
                type="button"
                disabled={saving || readOnly}
                className={coachingPrimaryBtn}
                onClick={() => void goNext()}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save & next
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || readOnly}
                className={coachingPrimaryBtn}
                onClick={() => void submitAll()}
              >
                Submit assessment
              </button>
            )}
          </div>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </div>
      )}
    </div>
  );
}
