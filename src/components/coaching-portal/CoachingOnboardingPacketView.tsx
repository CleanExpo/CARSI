'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingPage,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { COACHING_ASSESSMENT_SECTIONS } from '@/lib/coaching-portal/assessment-schema';
import { COACHING_SOCIAL_FIELDS } from '@/lib/coaching-portal/business-profile';
import type { CoachingOnboardingSnapshot } from '@/lib/coaching-portal/onboarding-snapshot';

function Field({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  const isUrl = /^https?:\/\//i.test(value.trim());
  return (
    <div className="border-b border-white/[0.06] py-3 last:border-0">
      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      {isUrl ? (
        <a
          href={value.trim()}
          className="mt-1 block text-sm break-all text-sky-300 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {value.trim()}
        </a>
      ) : (
        <p className="mt-1 text-sm whitespace-pre-wrap text-slate-200">{value}</p>
      )}
    </div>
  );
}

export function CoachingOnboardingPacketView() {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<CoachingOnboardingSnapshot | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/coaching/portal/onboarding/packet');
      const data = (await res.json()) as {
        available?: boolean;
        submittedAt?: string | null;
        snapshot?: CoachingOnboardingSnapshot | null;
      };
      setSubmittedAt(data.submittedAt ?? null);
      setSnapshot(data.snapshot ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className={`${coachingPage} flex justify-center py-20`}>
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" aria-label="Loading" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className={coachingPage}>
        <p className={coachingMuted}>No onboarding submission on file yet.</p>
        <Link
          href="/coaching/onboarding/submit"
          className={`mt-4 inline-flex ${coachingSecondaryBtn}`}
        >
          Send to Phill
        </Link>
      </div>
    );
  }

  const { profile, statements, assessmentResponses, member } = snapshot;
  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' })
    : new Date(snapshot.submittedAtIso).toLocaleString('en-AU', {
        dateStyle: 'long',
        timeStyle: 'short',
      });

  return (
    <div className={coachingPage}>
      <Link href="/coaching" className="text-sm text-sky-400 hover:text-sky-300">
        ← Home
      </Link>
      <header className="mt-5 mb-6">
        <p className={coachingEyebrow}>Read-only record</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">What we sent Phill</h1>
        <p className={`mt-2 max-w-2xl ${coachingMuted}`}>
          Frozen copy of your onboarding at submission ({submittedLabel}). Contact support if
          something urgent needs correcting.
        </p>
      </header>

      <div className="space-y-4">
        <section className={coachingCard}>
          <h2 className={coachingCardTitle}>Your message</h2>
          <Field label="Biggest problem" value={statements.problemStatement} />
          <Field label="Your goal" value={statements.goalStatement} />
          <Field label="Extra notes" value={statements.extraNotes} />
        </section>

        <section className={coachingCard}>
          <h2 className={coachingCardTitle}>Member</h2>
          <Field label="Name" value={member.fullName} />
          <Field label="Email" value={member.email} />
        </section>

        <section className={coachingCard}>
          <h2 className={coachingCardTitle}>Business profile</h2>
          <Field label="Business name" value={profile.businessName} />
          <Field label="Industry" value={profile.industry} />
          <Field label="Location" value={profile.location} />
          <Field label="Service areas" value={profile.serviceAreas} />
          <Field label="Years in business" value={profile.yearsInBusiness} />
          <Field label="Business size" value={profile.businessSize} />
          <Field label="Employees" value={profile.employeeCount} />
          <Field label="Main services" value={profile.mainServices} />
          <Field label="Challenges (profile)" value={profile.challenges} />
          <Field label="Short-term goals" value={profile.shortTermGoals} />
          <Field label="Long-term vision" value={profile.longTermVision} />
        </section>

        <section className={coachingCard}>
          <h2 className={coachingCardTitle}>Web & social</h2>
          <Field label="Website" value={profile.website} />
          {COACHING_SOCIAL_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label} value={profile[key]} />
          ))}
          <Field label="Other listings" value={profile.socialNotes} />
        </section>

        {COACHING_ASSESSMENT_SECTIONS.map((section) => (
          <section key={section.id} className={coachingCard}>
            <h2 className={coachingCardTitle}>{section.title}</h2>
            <p className={`mb-3 ${coachingMuted}`}>{section.description}</p>
            {section.fields.map((field) => (
              <Field
                key={field.id}
                label={field.label}
                value={assessmentResponses[field.id] ?? ''}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
