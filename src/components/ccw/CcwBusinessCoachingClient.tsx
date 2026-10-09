'use client';

import {
  ArrowRight,
  Bot,
  Compass,
  LineChart,
  Map,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

import { BusinessCoachingMonthlySubscribe } from '@/components/ccw/BusinessCoachingMonthlySubscribe';
import {
  BusinessCoachingAddOnsSection,
  BusinessCoachingInclusionsSection,
  BusinessCoachingPortalSection,
} from '@/components/ccw/BusinessCoachingProgramSections';
import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { MarketingGrowthLinks } from '@/components/marketing/MarketingGrowthLinks';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import { businessCoachingPath } from '@/lib/marketing/business-coaching';
import {
  carsiCoachingMonthlyPath,
  carsiCoachingMonthlyPriceLabel,
  carsiCoachingMonthlyTagline,
  carsiCoachingProductName,
  carsiCoachingWorkshopPath,
} from '@/lib/marketing/carsi-coaching-monthly';
import {
  carsiCoachingAddOnsComingSoon,
  carsiCoachingPortalPath,
} from '@/lib/marketing/carsi-coaching-program';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';

const horizontalPillars = [
  {
    icon: Compass,
    title: 'Your horizontal',
    body: 'What you already bring — past jobs, education, hands-on skill, and the gear on the truck. We start there, not with a generic template.',
  },
  {
    icon: Map,
    title: 'Your direction',
    body: 'Where you want the business in 6, 12, 60 months — and what “good” looks like in plain language, not buzzwords.',
  },
  {
    icon: TrendingUp,
    title: 'Built for sale',
    body: 'Every business should be set up so it could be sold. That discipline forces clean systems, real numbers, and marketing that works without you chasing every lead.',
  },
  {
    icon: Target,
    title: 'Use what you have',
    body: 'More equipment is rarely the answer. We maximise what is already paid for — routes, reviews, website, SEO, and AI search visibility — before you spend again.',
  },
] as const;

const programSteps = [
  {
    step: '01',
    title: 'Onboarding & vision',
    body: 'Capture your horizontal, your market, and your 6–12 month targets. Your plan lives in CARSI, not a forgotten Word doc.',
  },
  {
    step: '02',
    title: 'LMS roadmap (weekly)',
    body: 'Short, ordered actions in the platform — website fixes, Google Business Profile, content, quoting, cash flow, and CARSI training modules that match your gaps.',
  },
  {
    step: '03',
    title: 'AI in the business',
    body: 'Practical AI for small operators: search visibility, content, customer comms, and admin — without replacing your judgement.',
  },
  {
    step: '04',
    title: 'Monthly owner session',
    body: 'At least one live session with Phill each month: review the month honestly, adjust the plan, and set the next month bespoke to your vision.',
  },
] as const;

const faqs = [
  {
    question: 'Who is this for?',
    answer:
      'Owner-operators in cleaning, pressure washing, restoration, and related trades who have capability on the tools but are not getting marketing traction — weak websites, under-used social, SEO spend without results, or no presence in AI search.',
  },
  {
    question: 'How is this different from the two-day Business Growth Days?',
    answer:
      'Growth Days are an intensive in-person event with CCW. Business Coaching is an ongoing monthly program: LMS progress, customised plan, and a recurring owner session — built to scale online.',
  },
  {
    question: 'What does $495/month include?',
    answer:
      'Strategy (horizontal + direction, living business plan), marketing (website, GBP, social, SEO/AI visibility), operations (quoting and cash flow), curated CARSI modules, AI workflows, the Business Coaching Portal, and at least one live monthly session with Phill. See the full inclusion list on this page.',
  },
  {
    question: 'What is the Business Coaching Portal?',
    answer:
      'A dedicated coaching area (separate from My Learning) for your plan, monthly actions, session prep, and resources. Sign in after subscribing to open it at /coaching.',
  },
  {
    question: 'Are add-ons included in $495/month?',
    answer:
      'No. Optional extras (partner seats, extra 1:1s, implementation sprints, etc.) are listed with planned pricing for transparency. Add-on booking is coming soon — email support@carsi.com.au if you need something urgently.',
  },
  {
    question: 'Do I need to be on-site?',
    answer:
      'Most of the work is self-paced online. The monthly session is live (video or in-person when scheduled). You move through the LMS between sessions.',
  },
  {
    question: 'Is this IICRC technical training?',
    answer:
      'No. This is business development and marketing systems for owners. Technical accreditation remains on the CARSI course catalogue.',
  },
] as const;

export function CcwBusinessCoachingClient({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-[#fafbfc]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(36,144,237,0.18),transparent_55%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <div className="mx-auto max-w-3xl text-center">
            <p className={LANDING_EYEBROW_CLASS}>Owner-operators · Cleaning & restoration</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-[2.2rem] leading-[1.08] font-semibold tracking-[-0.03em] text-slate-950 md:text-[3.25rem]">
              {carsiCoachingProductName}
            </h1>
            <p className={`mx-auto mt-5 max-w-2xl ${LANDING_LEAD_CLASS}`}>
              {carsiCoachingMonthlyTagline}
            </p>
            <p className="mt-4 text-lg font-semibold text-[#146fc2]">
              {carsiCoachingMonthlyPriceLabel}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="w-full max-w-md">
                <BusinessCoachingMonthlySubscribe checkoutEnabled={checkoutEnabled} />
              </div>
              <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-600">
                <Link
                  href="#coaching-inclusions"
                  className="font-medium text-[#146fc2] hover:underline"
                >
                  What&apos;s included
                </Link>
                <Link
                  href="#coaching-addons"
                  className="font-medium text-[#146fc2] hover:underline"
                >
                  Add-ons {carsiCoachingAddOnsComingSoon ? '(soon)' : '& prices'}
                </Link>
                <Link
                  href={carsiCoachingPortalPath}
                  className="font-medium text-[#146fc2] hover:underline"
                >
                  Coaching portal
                </Link>
              </p>
              <PlatformNav current={carsiCoachingMonthlyPath} />
            </div>
          </div>
        </div>
      </section>

      <HomeTrustStrip
        stats={[
          { value: 'LMS', label: 'Tracked progress' },
          { value: '1×', label: 'Live session / month min.' },
          { value: 'AI', label: 'Search & ops integration' },
          { value: 'You', label: 'Custom plan — not a template' },
        ]}
      />

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>The model</p>
          <h2 className={`mt-3 max-w-3xl ${LANDING_DISPLAY_H2_CLASS}`}>
            Horizontal plus direction — every month on purpose
          </h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            Phill&apos;s coaching style maps what you already bring (your horizontal) against where
            you want the business to go, then builds a plan you can actually execute in the
            timeframe — marketing, systems, training, and AI — without defaulting to &ldquo;buy more
            gear.&rdquo;
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {horizontalPillars.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 shadow-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#146fc2] shadow-sm">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>How it runs</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Online-first, so it scales</h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            Most of the work happens in CARSI between sessions — clear steps, visible progress, and
            training modules matched to your gaps. The monthly session is the grill: what worked,
            what didn&apos;t, and what happens next.
          </p>
          <ol className="mt-10 grid gap-4 lg:grid-cols-2">
            {programSteps.map(({ step, title, body }) => (
              <li
                key={step}
                className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                <span
                  className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#146fc2]/40 tabular-nums"
                  aria-hidden
                >
                  {step}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-[#2490ed]/25 bg-[#eef5fb] px-5 py-4 text-sm text-slate-700">
            <Bot className="h-5 w-5 shrink-0 text-[#146fc2]" aria-hidden />
            <p>
              <span className="font-semibold text-slate-900">AI &amp; discoverability:</span> fix
              the basics (GBP, site structure, content) and show up where customers search —
              including AI-assisted search — instead of paying for SEO with nothing to show after
              eight months.
            </p>
          </div>
        </div>
      </section>

      <div id="coaching-inclusions">
        <BusinessCoachingInclusionsSection />
      </div>
      <div id="coaching-addons">
        <BusinessCoachingAddOnsSection checkoutEnabled={checkoutEnabled} />
      </div>
      <div id="coaching-portal">
        <BusinessCoachingPortalSection />
      </div>

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className={LANDING_EYEBROW_CLASS}>Real example</p>
              <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
                Half a million in gear — still invisible online
              </h2>
              <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
                A young owner with serious pressure-washing investment but a thin website, social
                set up wrong, and ~$800/month on SEO with almost no traction — and not even
                registered for the search surfaces that matter today. Coaching starts with the
                horizontal (skill + assets) and the direction (who you want to be known by), then
                rebuilds marketing and systems before another dollar hits ads or equipment.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <LineChart className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2]" aria-hidden />
                  Numbers you can explain to a buyer or a bank
                </li>
                <li className="flex gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2]" aria-hidden />
                  Website, social, and SEO that match how you actually work
                </li>
                <li className="flex gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2]" aria-hidden />
                  Monthly accountability with Phill — not a static course
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-8 shadow-lg">
              <p className="text-sm font-semibold text-slate-950">Join Business Coaching</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-[#146fc2]">
                {carsiCoachingMonthlyPriceLabel}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Sign in, subscribe securely, and we onboard you into your CARSI plan and LMS track.
              </p>
              <BusinessCoachingMonthlySubscribe
                checkoutEnabled={checkoutEnabled}
                className="mt-6"
              />
              <p className="mt-6 text-xs leading-relaxed text-slate-500">
                Prefer a lower-cost group conversation? See{' '}
                <Link href={businessCoachingPath} className="text-[#146fc2] hover:underline">
                  Owner Circle
                </Link>{' '}
                ($22/seat). For a two-day intensive, see{' '}
                <Link href={ccwRoadshowPath} className="text-[#146fc2] hover:underline">
                  Business Growth Days
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-12">
        <div
          className={`${PUBLIC_SHELL_INNER_CLASS} flex flex-wrap items-center justify-between gap-4`}
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">Hands-on carpet workshop</p>
            <p className="mt-1 text-sm text-slate-600">
              Two-day CCW fibre &amp; chemistry workshop — participant pack lives on a separate
              page.
            </p>
          </div>
          <Link
            href={carsiCoachingWorkshopPath}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#146fc2] shadow-sm transition hover:border-[#2490ed]/40"
          >
            CCW workshop materials
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <HomeFaqSection faqs={[...faqs]} />
      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-12`}>
        <MarketingGrowthLinks currentHref={carsiCoachingMonthlyPath} />
      </div>
      <HomeFinalCtaSection />
    </>
  );
}
