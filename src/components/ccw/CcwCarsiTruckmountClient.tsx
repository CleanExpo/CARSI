'use client';

import { MarketingGrowthLinks } from '@/components/marketing/MarketingGrowthLinks';
import { CitablePassage, FAQSchema } from '@/components/seo';
import {
  MarketingPageShell,
  marketingPageInnerNarrowClass,
} from '@/components/marketing/MarketingPageShell';
import {
  TRUCKMOUNT_COURSE_HREF,
  TRUCKMOUNT_PACK_HTML_HREF,
  TRUCKMOUNT_PACK_PDF_HREF,
} from '@/lib/ccw/truckmount-course';
import { ccwWorkshopPath } from '@/lib/marketing/marketing-growth-links';
import { marketingHeading, marketingPanel } from '@/lib/marketing/marketing-ui';
import {
  Award,
  BookOpen,
  Download,
  ExternalLink,
  Flame,
  Gauge,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';

/** Hero pillar + anchor lines. */
const PILLAR_LINE =
  'Configurations · Safe Operation · Storage & Transport · Road Safety · Maintenance · Assessment';
const ANCHORED_HERO =
  'HydraMaster & Sapphire Scientific · Australian configuration · standards-sourced';

/** Course units — Part B. */
const units = [
  {
    icon: BookOpen,
    code: 'Unit 3.1',
    title: 'Australian Configurations & Specifications',
    body: 'Live AU model line-up and specs — and why these machines run on petrol + 12 V DC, not 240 V mains.',
  },
  {
    icon: Flame,
    code: 'Unit 3.2',
    title: 'Safe Operating Procedures',
    body: 'Pre-start, startup and shutdown sequences, and the hazard controls — carbon monoxide first.',
  },
  {
    icon: Truck,
    code: 'Unit 3.3',
    title: 'Storage, Transport & Road Safety',
    body: 'Load restraint, GVM and axle limits, fuel and chemical carriage, and the rego / insurance modification trap.',
  },
  {
    icon: Wrench,
    code: 'Unit 3.4',
    title: 'Maintenance & Servicing',
    body: 'The run-hour maintenance program, hard-water descaling, fault diagnosis, and the CCW service network.',
  },
  {
    icon: Gauge,
    code: 'Unit 3.5',
    title: 'Image Catalogue',
    body: 'Verified reference imagery of units, layouts, controls and components, with licensing notes.',
  },
  {
    icon: ShieldCheck,
    code: 'Unit 3.6',
    title: 'Assessment & Competency Sign-Off',
    body: 'A trainer pre-flight gate plus an operator competency assessment and sign-off — no operator passes unproven.',
  },
] as const;

/** What the course delivers. */
const included = [
  {
    icon: ShieldCheck,
    title: 'Part A — Safety Certificate',
    body: 'The manufacturer’s truck-mount safety certificate: the Australian regulatory map (Main Roads / NHVR, WHS, pressure, fuel) and a ready-to-complete template binding the licensed vehicle, gasfitter and electrician sign-offs.',
  },
  {
    icon: BookOpen,
    title: 'Part B — Six-unit operator course',
    body: 'Configurations, safe operation, storage / transport / road safety, maintenance, imagery, and assessment — every unit sourced to manufacturer manuals and Australian authorities.',
  },
  {
    icon: Truck,
    title: 'Australianised, machine-specific',
    body: 'HydraMaster and Sapphire Scientific units in Australian configuration, with a verification gate that keeps every safety setpoint tied to the actual machine’s manual.',
  },
] as const;

const faq = [
  {
    q: 'Who is this course for?',
    a: 'Operators and technicians running HydraMaster or Sapphire Scientific truck-mounts in Australia, and the businesses that supply and service them.',
  },
  {
    q: 'Is this a substitute for the manufacturer’s manual?',
    a: 'No. It is training material — not legal advice and not a replacement for the unit’s manual or a licensed practitioner. Every safety-critical setpoint is verified against the specific machine before it is taught as fact (Unit 3.6, Gate A).',
  },
  {
    q: 'What standards does it draw on?',
    a: 'Manufacturer service and owner manuals, and Australian primary authorities — NHVR, NTC, Safe Work Australia, state transport and water authorities. Sources are listed at the foot of each unit.',
  },
  {
    q: 'How do I use the pack?',
    a: 'Open the interactive pack in your browser and read it on screen, or download the PDF edition. The pack opens with a “how to use” gate that explains the verification step before delivery.',
  },
  {
    q: 'Does this course help with my insurance cover?',
    a: 'No industry body certifies truck-mount vehicle, gas or electrical safety, so the certificate binds the separate statutory sign-offs — road, gas, electrical and water — into one dossier. Use the compliance points in the course as a discussion point to start the conversation with your insurance broker, so your cover reflects how the unit is actually built, installed, transported and operated.',
  },
] as const;

export function CcwCarsiTruckmountClient() {
  return (
    <MarketingPageShell innerClassName={marketingPageInnerNarrowClass}>
      {/* Hero */}
      <header className="text-center">
        <p className="mb-4 text-[10px] font-semibold tracking-[0.22em] text-slate-600 uppercase dark:text-white/55">
          CARSI × Carpet Cleaners Warehouse · Specialised
        </p>
        <h1 className={`text-balance ${marketingHeading}`}>Truckmount Operations Course</h1>
        <div
          className="mx-auto mt-6 h-px w-16 bg-linear-to-r from-transparent via-[#2490ed]/80 to-transparent"
          aria-hidden
        />
        <p className="mx-auto mt-6 max-w-3xl text-sm leading-relaxed tracking-wide text-slate-600 md:text-[15px] dark:text-white/55">
          {PILLAR_LINE}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-xs font-medium text-[#146fc2] dark:text-[#7ec5ff]/90 md:text-sm">
          {ANCHORED_HERO}
        </p>
        <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-pretty text-slate-600 md:text-lg dark:text-white/50">
          A specialised operator course for petrol-engine truck-mount systems in Australian
          configuration — safe operation, transport and road-safety compliance, maintenance, and a
          competency sign-off, all sourced to manufacturer manuals and Australian authorities.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={TRUCKMOUNT_COURSE_HREF}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#146fc2] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1769b8] sm:w-auto"
          >
            <Award className="h-5 w-5 shrink-0" aria-hidden />
            Enrol to get certified
          </a>
          <a
            href={TRUCKMOUNT_PACK_HTML_HREF}
            target="_blank"
            rel="noopener"
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
            Read the course pack
          </a>
          <a
            href={TRUCKMOUNT_PACK_PDF_HREF}
            download
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            <Download className="h-5 w-5 shrink-0" aria-hidden />
            Download PDF
          </a>
        </div>
        <p className="mx-auto mt-4 max-w-xl text-xs leading-relaxed text-slate-500 dark:text-white/45">
          Enrol to have your progress and Unit 3.6 competency sign-off recorded in CARSI and a
          certificate issued on completion — or read the full pack and take the PDF without
          enrolling.
        </p>
      </header>

      {/* What the course delivers */}
      <section className="mt-20 md:mt-24" aria-labelledby="tm-included-heading">
        <div className="mb-8 border-b border-white/8 pb-6">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-600 uppercase dark:text-white/55">
            What the course delivers
          </p>
          <h2
            id="tm-included-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl dark:text-white"
          >
            Compliance and operation, in one pack
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {included.map(({ icon: Icon, title, body }) => (
            <div key={title} className={`rounded-2xl p-5 md:p-6 ${marketingPanel}`}>
              <Icon className="h-6 w-6 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Course units */}
      <section className="mt-20 md:mt-24" aria-labelledby="tm-units-heading">
        <div className="mb-8 border-b border-white/8 pb-6">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-600 uppercase dark:text-white/55">
            Part B — Operator course
          </p>
          <h2
            id="tm-units-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl dark:text-white"
          >
            Six units, from configuration to sign-off
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {units.map(({ icon: Icon, code, title, body }) => (
            <div key={code} className={`rounded-2xl p-5 md:p-6 ${marketingPanel}`}>
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden />
                <p className="text-[10px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#7ec5ff]">
                  {code}
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Access */}
      <section className="mt-20 md:mt-28" aria-labelledby="tm-access-heading">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-600 uppercase dark:text-white/55">
            The course pack
          </p>
          <h2
            id="tm-access-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl dark:text-white"
          >
            Read it online, or take the PDF
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-white/55">
            The pack opens with a “how to use” gate: it is training reference, not fact for a
            specific machine, until Unit 3.6 “Gate A” is completed against the actual unit and the
            operator’s State. No operator is signed off unproven.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={TRUCKMOUNT_PACK_HTML_HREF}
            target="_blank"
            rel="noopener"
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#146fc2] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1769b8] sm:w-auto"
          >
            <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
            Open the course pack
          </a>
          <a
            href={TRUCKMOUNT_PACK_PDF_HREF}
            download
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            <Download className="h-5 w-5 shrink-0" aria-hidden />
            Download PDF
          </a>
        </div>
      </section>

      {/* FAQ */}
      <FAQSchema questions={faq.map(({ q, a }) => ({ question: q, answer: a }))} />
      <section className="mx-auto mt-20 max-w-3xl md:mt-24" aria-labelledby="tm-faq-heading">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-600 uppercase dark:text-white/55">
            FAQ
          </p>
          <h2
            id="tm-faq-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl dark:text-white"
          >
            Before you start
          </h2>
        </div>
        <div className="space-y-3">
          {faq.map(({ q, a }) => (
            <details
              key={q}
              className={`group rounded-2xl p-5 md:p-6 ${marketingPanel}`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-900 dark:text-white">
                {q}
                <span className="text-[#146fc2] transition group-open:rotate-45 dark:text-[#7ec5ff]" aria-hidden>
                  +
                </span>
              </summary>
              <CitablePassage
                variant="faq-answer"
                className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-white/60"
              >
                {a}
              </CitablePassage>
            </details>
          ))}
        </div>
      </section>

      <MarketingGrowthLinks currentHref={ccwWorkshopPath} />
    </MarketingPageShell>
  );
}
