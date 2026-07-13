'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { OnboardingLearnerDashboard } from '@/components/onboarding/OnboardingLearnerDashboard';
import { OnboardingLearningRoadmap } from '@/components/onboarding/OnboardingLearningRoadmap';
import { OnboardingProgramHero } from '@/components/onboarding/OnboardingProgramHero';
import { apiClient, ApiClientError } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';
import {
  FLOOR_CARE_PHASES,
  formatOnboardingPrice,
  type CurriculumModuleShape,
  type OnboardingPhase,
} from '@/lib/onboarding/enterprise';

type ProgramPayload = {
  program: {
    slug: string;
    title: string;
    shortDescription: string | null;
    enrolled: boolean;
    meta: {
      program?: string;
      company?: string;
      pricing?: { amountAud?: number; billingCycle?: string; gst?: string; seats?: string };
    } | null;
  };
  modules: CurriculumModuleShape[];
  phases: OnboardingPhase[];
  progress: { percent: number; nextLessonId: string | null };
};

export function OnboardingProgramClient({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ProgramPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolLoading, setEnrolLoading] = useState(false);
  const [enrolError, setEnrolError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [organisationName, setOrganisationName] = useState('');

  const load = useCallback(() => {
    setError(null);
    apiClient
      .get<ProgramPayload>(`/api/lms/onboarding/${encodeURIComponent(slug)}`)
      .then(setData)
      .catch(() => setError('Program not found or you do not have access.'));
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    load();
  }, [load]);

  useEffect(() => {
    if (!data?.program) return;
    const defaultOrgName =
      data.program.meta?.company?.trim() ||
      data.program.title.replace(/^CARSI Maintenance Company Onboarding — /, '').trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing rule promotion; behaviour-preserving suppression, real fix tracked separately
    setOrganisationName((prev) => prev || defaultOrgName);
  }, [data?.program]);

  useEffect(() => {
    if (searchParams.get('checkout') === 'cancelled') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
      setCheckoutMessage('Checkout was cancelled. You can subscribe when ready to start training.');
      router.replace(`/dashboard/onboarding/${slug}`, { scroll: false });
    }
  }, [searchParams, router, slug]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId || confirmingPayment) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    setConfirmingPayment(true);
    setEnrolError(null);
    apiClient
      .post<{ learn_url?: string; already_enrolled?: boolean }>('/api/lms/enrollments/confirm', {
        session_id: sessionId,
      })
      .then((res) => {
        if (res.learn_url) {
          router.replace(res.learn_url);
          return;
        }
        router.replace(`/dashboard/onboarding/${slug}`, { scroll: false });
        load();
      })
      .catch((err) => {
        const msg =
          err instanceof ApiClientError
            ? err.message
            : 'Payment received but enrolment could not be confirmed. Contact support.';
        setEnrolError(msg);
        router.replace(`/dashboard/onboarding/${slug}`, { scroll: false });
      })
      .finally(() => setConfirmingPayment(false));
  }, [searchParams, router, slug, load, confirmingPayment]);

  if ((!data && !error) || confirmingPayment) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p>{confirmingPayment ? 'Confirming your subscription…' : 'Loading program…'}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full px-4 py-16 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard/onboarding" className={`${dash.btnSecondary} mt-6 inline-flex`}>
          Back to onboarding
        </Link>
      </div>
    );
  }

  const { program, modules, phases, progress } = data;
  const learnHref = progress.nextLessonId
    ? `/dashboard/learn/${slug}?lesson=${progress.nextLessonId}`
    : `/dashboard/learn/${slug}`;

  const priceLabel = formatOnboardingPrice(program.meta?.pricing ?? null);

  const ctaLabel = program.enrolled
    ? progress.percent >= 100
      ? 'Review training'
      : 'Continue training'
    : `Subscribe — ${priceLabel}`;

  async function handleCheckout() {
    setEnrolLoading(true);
    setEnrolError(null);
    setCheckoutMessage(null);
    try {
      const origin = window.location.origin;
      const res = await apiClient.post<{ checkout_url?: string }>(
        `/api/lms/onboarding/${encodeURIComponent(slug)}/checkout`,
        {
          organisation_name: organisationName,
          success_url: `${origin}/dashboard/onboarding/${encodeURIComponent(slug)}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/dashboard/onboarding/${encodeURIComponent(slug)}?checkout=cancelled`,
        },
      );
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      setEnrolError('Could not start checkout. Please try again.');
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Could not start checkout. Please try again or contact CARSI.';
      setEnrolError(msg);
    } finally {
      setEnrolLoading(false);
    }
  }

  return (
    <div className="w-full max-w-none space-y-10 pb-16">
      <nav className="text-sm text-slate-500">
        <Link href="/dashboard/onboarding" className="hover:text-[#146fc2]">
          Onboarding
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">
          {program.title.replace(/^CARSI Maintenance Company Onboarding — /, '')}
        </span>
      </nav>

      <OnboardingProgramHero
        programTitle={program.title}
        programSlug={slug}
        valueProposition={
          program.shortDescription ??
          "Build consistent maintenance standards across your workforce with CARSI's professional onboarding framework."
        }
        enrolled={program.enrolled}
        progressPercent={program.enrolled ? progress.percent : null}
        pricingNote={priceLabel}
        ctaHref={program.enrolled ? learnHref : undefined}
        onCtaClick={program.enrolled ? undefined : handleCheckout}
        ctaLoading={enrolLoading}
        ctaLabel={ctaLabel}
      />

      {checkoutMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {checkoutMessage}
        </p>
      ) : null}

      {enrolError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {enrolError}
        </p>
      ) : null}

      {program.enrolled ? (
        <OnboardingLearnerDashboard slug={slug} modules={modules} />
      ) : (
        <div
          className={`${dash.cardInset} space-y-4 border-[#2490ed]/20 bg-[#eef7ff]/50 p-6 text-sm text-slate-700`}
        >
          <p>
            <strong className="text-slate-900">Organisation subscription.</strong> Access is
            provisioned after payment ({priceLabel}). Unlimited learners per organisation.
          </p>
          <label className="block text-sm text-slate-800">
            Organisation name
            <input
              required
              minLength={2}
              value={organisationName}
              onChange={(e) => setOrganisationName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
              placeholder="e.g. Acme Facilities Pty Ltd"
            />
          </label>
        </div>
      )}

      <OnboardingLearningRoadmap
        modules={modules}
        phases={phases.length > 0 ? phases : FLOOR_CARE_PHASES}
        onSelectModule={
          program.enrolled
            ? (moduleId) => {
                router.push(`/dashboard/learn/${slug}?module=${moduleId}`);
              }
            : undefined
        }
      />
    </div>
  );
}
