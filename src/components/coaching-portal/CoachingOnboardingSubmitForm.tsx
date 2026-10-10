'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  CoachingFormSection,
  CoachingTextArea,
} from '@/components/coaching-portal/coaching-form-primitives';
import {
  coachingCard,
  coachingEyebrow,
  coachingMuted,
  coachingPage,
  coachingPrimaryBtn,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';

type Eligibility = {
  eligible: boolean;
  alreadySubmitted: boolean;
  submittedAt: string | null;
  profileComplete: boolean;
  assessmentSubmitted: boolean;
  prefill: { problemStatement: string; goalStatement: string };
};

export function CoachingOnboardingSubmitForm() {
  const { access, onboardingSubmit } = useCoachingPortal();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [problemStatement, setProblemStatement] = useState('');
  const [goalStatement, setGoalStatement] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/coaching/portal/onboarding/submit');
        const data = (await res.json()) as Eligibility;
        setEligibility(data);
        if (!data.alreadySubmitted) {
          setProblemStatement(data.prefill.problemStatement);
          setGoalStatement(data.prefill.goalStatement);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submitted = eligibility?.alreadySubmitted || onboardingSubmit.complete;

  async function submit() {
    if (!access.canEdit || submitted) return;
    if (!confirmed) {
      setError('Please confirm your submission.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/coaching/portal/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemStatement,
          goalStatement,
          extraNotes,
          confirm: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setError(data.detail ?? 'Could not submit.');
        return;
      }
      router.refresh();
      setEligibility((e) =>
        e
          ? { ...e, alreadySubmitted: true, eligible: false, submittedAt: new Date().toISOString() }
          : e
      );
    } catch {
      setError('Could not submit.');
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

  if (!eligibility?.profileComplete) {
    return (
      <div className={coachingPage}>
        <p className={coachingMuted}>Complete your business profile first.</p>
        <Link
          href="/coaching/onboarding/profile"
          className={`mt-4 inline-flex ${coachingPrimaryBtn}`}
        >
          Business profile
        </Link>
      </div>
    );
  }

  if (!eligibility.assessmentSubmitted) {
    return (
      <div className={coachingPage}>
        <p className={coachingMuted}>Submit your business assessment before sending to Phill.</p>
        <Link
          href="/coaching/onboarding/assessment"
          className={`mt-4 inline-flex ${coachingPrimaryBtn}`}
        >
          Business assessment
        </Link>
      </div>
    );
  }

  if (submitted) {
    const when = eligibility.submittedAt ?? onboardingSubmit.submittedAt;
    return (
      <div className={coachingPage}>
        <div className={coachingCard}>
          <div className="flex gap-3">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-400" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold text-white">Sent to Phill</h1>
              <p className={`mt-2 ${coachingMuted}`}>
                Your full profile, assessment, and message were emailed to the coaching team
                {when
                  ? ` on ${new Date(when).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}`
                  : ''}
                . You should also have a confirmation in your inbox.
              </p>
              <p className={`mt-3 ${coachingMuted}`}>
                This submission is final in the portal. Contact support if something urgent needs
                updating.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/coaching/sessions" className={coachingPrimaryBtn}>
                  Book your first session
                </Link>
                <Link href="/coaching" className={coachingSecondaryBtn}>
                  Home
                </Link>
              </div>
            </div>
          </div>
        </div>
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
          Send your details to Phill
        </h1>
        <p className={`mt-2 max-w-2xl ${coachingMuted}`}>
          We will automatically email Phill your complete business profile, every assessment answer,
          and your web/social links — plus the problem and goal you write below. You will get a
          confirmation email as well.
        </p>
      </header>

      <div className={`${coachingCard} space-y-6`}>
        <CoachingFormSection
          title="In your own words"
          description="These lines are highlighted for Phill at the top of the email. They are pre-filled from your profile — edit them if you want to be clearer."
        >
          <CoachingTextArea
            label="What is the biggest problem you are facing right now?"
            required
            rows={5}
            value={problemStatement}
            disabled={!access.canEdit}
            placeholder="Be specific — what keeps you up at night in the business?"
            onChange={setProblemStatement}
          />
          <CoachingTextArea
            label="What does success look like to you?"
            required
            rows={5}
            value={goalStatement}
            disabled={!access.canEdit}
            placeholder="According to your mind — not what you think we want to hear."
            onChange={setGoalStatement}
          />
          <CoachingTextArea
            label="Anything else Phill should know before your first session?"
            rows={3}
            value={extraNotes}
            disabled={!access.canEdit}
            onChange={setExtraNotes}
          />
        </CoachingFormSection>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={!access.canEdit}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-[#060a14] text-sky-500 focus:ring-sky-500/30"
          />
          <span className={`text-sm ${coachingMuted}`}>
            I confirm this is accurate. I understand my full profile and assessment will be emailed
            to Phill and I will receive a confirmation copy. I cannot edit this submission later in
            the portal.
          </span>
        </label>

        {!access.canEdit ? (
          <p className="text-sm text-amber-200/90">Staff preview — submitting is disabled.</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving || !access.canEdit || !confirmed}
            className={coachingPrimaryBtn}
            onClick={() => void submit()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit to Phill
          </button>
          <Link href="/coaching/onboarding/assessment" className={coachingSecondaryBtn}>
            Review assessment
          </Link>
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    </div>
  );
}
