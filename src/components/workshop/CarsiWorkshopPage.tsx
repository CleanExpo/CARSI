import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { MarketingGrowthLinks } from '@/components/marketing/MarketingGrowthLinks';
import { PlatformContextualNext } from '@/components/marketing/platform/PlatformPagePattern';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import { StaticMarketingClosingCta } from '@/components/marketing/StaticMarketingClosingCta';
import { carsiCoachingMonthlyPath } from '@/lib/marketing/carsi-coaching-monthly';
import {
  CARSI_WORKSHOP_COURSE_SLUG,
  CARSI_WORKSHOP_PATH,
  type WorkshopAccessState,
} from '@/lib/server/carsi-workshop-access';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  GraduationCap,
  Lock,
  ShieldCheck,
  Target,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { FROM_IICRC_APPROVED_CEC_PROVIDER } from '@/lib/iicrc/approved-wording';
/** Pillar topics — hero. */
const PILLAR_LINE =
  'Fibre · Chemistry · Methods · Upholstery · Hard Floors · Business · Maintenance';

/** Standards line — nominative reference only (no standard text is reproduced). */
const STANDARDS_LINE = 'Referenced to ANSI/IICRC S100 · S300 · S220';

/** Subordinate partner credit. CARSI owns and delivers the course. */
export const WORKSHOP_PARTNER_CREDIT =
  'Delivered on the CARSI roadshow with partner venue Carpet Cleaners Warehouse (CCW).';

const agendaDay1 = [
  'Welcome · Safety · Tier Self-Assessment',
  'Fibre Science — live burn tests',
  'Chemistry — pH, surfactants, CHAT',
  '5 Principles — 4-station hands-on',
  'Machinery — preventive maintenance',
  'Spot & Stain — decision tree',
  'Close · networking',
] as const;

const agendaDay2 = [
  'Upholstery fibres & 4-test pre-inspection',
  'Upholstery — 6 methods hands-on',
  'Hard Floors — inspection basics',
  'Business — costing, pricing, contracts',
  'Expert board case review · take-home manual',
] as const;

const included = [
  {
    icon: BookOpen,
    title: 'CARSI original curriculum',
    body: '16 online modules that follow the two days, with a knowledge check at the end of each one.',
  },
  {
    icon: Target,
    title: 'Two days on the tools',
    body: 'Hands-on modules across carpet, stain removal, upholstery, hard floors, business and machinery.',
  },
  {
    icon: ShieldCheck,
    title: 'Certificate of attendance',
    body: 'Issued by CARSI once you are checked in on both days. No IICRC CECs are attached to this workshop.',
  },
] as const;

const trainerMeta = [
  { term: 'Standards', text: 'ANSI/IICRC S100 · S300 · S220, applied in the Australian context' },
  { term: 'CARSI', text: `Online courses ${FROM_IICRC_APPROVED_CEC_PROVIDER}` },
  { term: 'Focus', text: 'Carpet · Stain Removal · Upholstery · Hard Floors · Business · Machinery' },
  { term: 'Method', text: 'Three tiers — Newby, Intermediate, Pro — layered into every module' },
] as const;

const faq = [
  {
    question: 'Who can open the online course?',
    answer:
      'CARSI roadshow attendees who checked in, and authorised CARSI instructors. Your CARSI account is created when you check in on Day 1. Sign in with the email you checked in with.',
  },
  {
    question: 'I checked in but cannot sign in. What now?',
    answer:
      'Use "Forgot password" on the sign-in page with the email you gave at check-in. If that email does not work, contact CARSI and we will match your check-in record.',
  },
  {
    question: 'What certificate do I receive?',
    answer:
      'A CARSI certificate of attendance once you are checked in on both days. No IICRC CECs are attached to this workshop.',
  },
  {
    question: 'Is the course listed in the CARSI catalogue?',
    answer:
      'No. It is a cohort course for roadshow attendees and is not sold or listed publicly.',
  },
] as const;

/** Committed course art — square crop reads cleanly in the hero card. */
const WORKSHOP_HERO_IMAGE = {
  src: '/images/courses/upholstery-cleaning.webp',
  alt: 'Hands-on upholstery and carpet cleaning practice during a CARSI workshop',
} as const;

const PARTICIPANT_MANUAL_HREF = '/api/lms/workshops/carpet-cleaning/participant-manual';
const INSTRUCTOR_MANUAL_HREF = '/api/lms/workshops/carpet-cleaning/instructor-manual';
const COURSE_HREF = `/dashboard/learn/${CARSI_WORKSHOP_COURSE_SLUG}`;

function AgendaLine({ text }: { text: string }) {
  return (
    <li className="border-b border-slate-200/80 py-3 text-sm leading-relaxed text-slate-600 last:border-0">
      {text}
    </li>
  );
}

const primaryLinkClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#146fc2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f5ea8] focus-visible:ring-2 focus-visible:ring-[#146fc2] focus-visible:ring-offset-2 focus-visible:outline-none';
const secondaryLinkClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-[#146fc2] hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#146fc2] focus-visible:ring-offset-2 focus-visible:outline-none';

function AccessPanel({ access }: { access: WorkshopAccessState }) {
  if (access === 'signed-out') {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-8 shadow-sm md:p-10">
        <div className="mb-5 flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#146fc2]" aria-hidden />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Sign in to open the course</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              The online course and participant manual are for checked-in roadshow attendees and
              authorised CARSI instructors. Sign in with the email you used at check-in.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/login?next=${encodeURIComponent(CARSI_WORKSHOP_PATH)}`}
            className={primaryLinkClass}
          >
            Sign in <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/forgot-password" className={secondaryLinkClass}>
            Set or reset my password
          </Link>
        </div>
      </div>
    );
  }

  if (access === 'not-enrolled') {
    return (
      <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-8 shadow-sm md:p-10">
        <h3 className="text-lg font-semibold text-slate-900">
          This account is not on a workshop cohort
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          The course opens for the CARSI account created at your roadshow check-in. If you
          attended and signed in with a different email, contact CARSI and we will match your
          check-in record.
        </p>
        <div className="mt-5">
          <Link href="/contact" className={secondaryLinkClass}>
            Contact CARSI
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-50 p-8 shadow-sm md:p-10">
      <div className="mb-6 flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <h3 className="text-lg font-semibold text-slate-900">You&apos;re in</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {access === 'staff'
              ? 'You are signed in as an authorised CARSI instructor.'
              : 'Your workshop enrolment is active.'}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href={COURSE_HREF} className={primaryLinkClass}>
          Open the course <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <a href={PARTICIPANT_MANUAL_HREF} className={secondaryLinkClass}>
          <Download className="h-4 w-4" aria-hidden /> Participant manual
        </a>
        {access === 'staff' ? (
          <a href={INSTRUCTOR_MANUAL_HREF} className={secondaryLinkClass}>
            <Lock className="h-4 w-4" aria-hidden /> Instructor manual
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function CarsiWorkshopPage({ access }: { access: WorkshopAccessState }) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-[#f4f7fa]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_15%_0%,rgba(36,144,237,0.12),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-14 md:py-20`}>
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_auto] lg:gap-14">
            <div className="text-center lg:text-left">
              <p className={LANDING_EYEBROW_CLASS}>CARSI · 2 days · Hands-on</p>
              <h1 className="mx-auto mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06] lg:mx-0">
                CARSI Carpet Cleaning Workshop
              </h1>
              <p className={`mx-auto mt-5 max-w-2xl ${LANDING_LEAD_CLASS} lg:mx-0`}>
                {PILLAR_LINE}
              </p>
              <p className="mx-auto mt-3 text-sm font-medium text-[#146fc2] lg:mx-0">
                {STANDARDS_LINE}
              </p>
              <p className={`mx-auto mt-6 max-w-xl ${LANDING_LEAD_CLASS} lg:mx-0`}>
                Two hands-on days with CARSI, then a 16-module online course and participant
                manual for everyone who attended.
              </p>
              <div className="mt-8 flex flex-col items-center gap-5 lg:items-start">
                <a href="#materials" className={primaryLinkClass}>
                  Attendee access <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
                <PlatformNav current={CARSI_WORKSHOP_PATH} />
                <p className="max-w-md text-center text-sm text-slate-500 lg:text-left">
                  Looking for monthly business coaching?{' '}
                  <Link
                    href={carsiCoachingMonthlyPath}
                    className="font-medium text-[#146fc2] hover:underline"
                  >
                    CARSI Business Coaching
                  </Link>
                </p>
              </div>
            </div>
            <figure className="mx-auto w-full max-w-[min(100%,22rem)] shrink-0 lg:mx-0">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5">
                <Image
                  src={WORKSHOP_HERO_IMAGE.src}
                  alt={WORKSHOP_HERO_IMAGE.alt}
                  fill
                  sizes="352px"
                  loading="eager"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
              <figcaption className="mt-3 text-center text-xs leading-relaxed text-slate-500 lg:text-left">
                {WORKSHOP_PARTNER_CREDIT}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <HomeTrustStrip
        stats={[
          { value: '2 days', label: 'Hands-on' },
          { value: '16', label: 'Online modules' },
          { value: '3 tiers', label: 'Newby · Intermediate · Pro' },
          { value: 'Free', label: 'For attendees' },
        ]}
      />

      <section
        className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
        aria-labelledby="workshop-trainer-heading"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Your trainer</p>
          <h2 id="workshop-trainer-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Phill McGurk — CARSI
          </h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            A CARSI original curriculum, written for Australian technicians and referenced to the
            ANSI/IICRC carpet, upholstery and hard-floor standards.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {trainerMeta.map(({ term, text }) => (
              <div
                key={term}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6"
              >
                <p className="text-[10px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase">
                  {term}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-t border-slate-200/70 bg-white py-16 md:py-24"
        aria-labelledby="workshop-agenda-heading"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Agenda</p>
          <h2 id="workshop-agenda-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Two days on the tools
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 md:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200/80 pb-4">
                <GraduationCap className="h-5 w-5 text-[#146fc2]" aria-hidden />
                <span className="text-sm font-semibold text-slate-950">Day 1</span>
              </div>
              <p className="mb-4 text-xs font-medium tracking-wide text-slate-600 uppercase">
                Carpet &amp; Stain Fundamentals
              </p>
              <ul className="list-none space-y-0">
                {agendaDay1.map((line) => (
                  <AgendaLine key={line} text={line} />
                ))}
              </ul>
            </div>
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 md:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200/80 pb-4">
                <GraduationCap className="h-5 w-5 text-[#146fc2]" aria-hidden />
                <span className="text-sm font-semibold text-slate-950">Day 2</span>
              </div>
              <p className="mb-4 text-xs font-medium tracking-wide text-slate-600 uppercase">
                Upholstery · Hard Floors · Business · Maintenance
              </p>
              <ul className="list-none space-y-0">
                {agendaDay2.map((line) => (
                  <AgendaLine key={line} text={line} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
        aria-labelledby="workshop-included-heading"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>What you get</p>
          <h2 id="workshop-included-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            What&apos;s included
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {included.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[#fafbfc]">
                  <Icon className="h-5 w-5 text-[#146fc2]" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="materials"
        className="scroll-mt-28 border-t border-slate-200/70 bg-white py-16 md:py-24"
        aria-labelledby="workshop-access-heading"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="mb-8 text-center md:mb-10">
            <p className={LANDING_EYEBROW_CLASS}>Attendees</p>
            <h2 id="workshop-access-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Course and manual
            </h2>
            <p className={`mx-auto mt-3 max-w-md ${LANDING_LEAD_CLASS}`}>
              Free for checked-in roadshow attendees and authorised CARSI instructors.
            </p>
          </div>
          <div className="mx-auto w-full max-w-xl">
            <AccessPanel access={access} />
          </div>
        </div>
      </section>

      <HomeFaqSection faqs={faq.map((f) => ({ ...f }))} />
      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-12`}>
        <MarketingGrowthLinks currentHref={CARSI_WORKSHOP_PATH} />
      </div>
      <PlatformContextualNext current={CARSI_WORKSHOP_PATH} />
      <StaticMarketingClosingCta />
    </>
  );
}
