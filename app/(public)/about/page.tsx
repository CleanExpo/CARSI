import type { Metadata } from 'next';
import { BadgeCheck, Shield } from 'lucide-react';

import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';
import { AboutMissionPillars } from '@/components/marketing/about/AboutMissionPillars';
import { MeetTheBoard } from '@/components/marketing/about/MeetTheBoard';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { getBoardMembers } from '@/lib/board-members';
import { disciplineRowsFromCodes } from '@/lib/iicrc-discipline-display';
import {
  formatCourseCountForCopy,
  getPublicCatalogueFacts,
} from '@/lib/server/public-catalogue-facts';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const facts = await getPublicCatalogueFacts();
  const n = facts.publishedCourseCount;
  const d = facts.disciplineCodes.length;
  const coursePhrase =
    n > 0
      ? `${formatCourseCountForCopy(n)} IICRC CEC Accredited course${n === 1 ? '' : 's'}`
      : 'IICRC CEC Accredited courses';
  const discPhrase =
    d > 0 ? `${d} discipline${d === 1 ? '' : 's'}` : 'multiple IICRC disciplines';
  return {
    title: 'About CARSI | Centre for Australian Restoration and Standards Information',
    description: `CARSI is Australia's leading online training platform for cleaning and restoration professionals. ${coursePhrase} across ${discPhrase}. 50+ years of combined industry experience.`,
  };
}

const credentials = [
  {
    title: 'CFO & CBFRS credentialed',
    desc: 'Certified Flooring Organisation and Certified Building Flood Recovery Specialist — one of very few holders of both credentials in Australia.',
  },
  {
    title: '50+ years combined experience',
    desc: 'Founders and instructors bring decades of hands-on experience across cleaning, water damage, and building restoration.',
  },
  {
    title: 'Raise the bar',
    desc: 'We exist to lift industry standards through education. Every course is designed by practitioners, for practitioners.',
  },
];

export default async function AboutPage() {
  const facts = await getPublicCatalogueFacts();
  const n = facts.publishedCourseCount;
  const d = facts.disciplineCodes.length;
  const disciplineRows =
    d > 0
      ? disciplineRowsFromCodes(facts.disciplineCodes)
      : disciplineRowsFromCodes(['WRT', 'CRT', 'ASD', 'AMRT', 'FSRT', 'OCT', 'CCT']);

  const stats = [
    {
      value: n > 0 ? formatCourseCountForCopy(n) : '—',
      label: 'Published courses',
    },
    {
      value: d > 0 ? formatCourseCountForCopy(d) : '7',
      label: 'IICRC disciplines',
    },
    { value: '12+', label: 'Industries served' },
    { value: '24/7', label: 'Study anytime' },
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_20%_0%,rgba(36,144,237,0.11),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <p className={LANDING_EYEBROW_CLASS}>About CARSI</p>
          <h1 className="mt-3 max-w-4xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
            Raising the bar for restoration professionals
          </h1>
          <p className={`mt-5 max-w-3xl text-pretty ${LANDING_LEAD_CLASS}`}>
            CARSI — the Centre for Australian Restoration and Standards Information — is
            Australia&apos;s online training platform for cleaning and restoration professionals.
            Beginner, intermediate, and advanced <AcronymTooltip term="IICRC" />{' '}
            <AcronymTooltip term="CEC" /> accredited courses for people starting out, updating their
            knowledge, or maintaining continuing education without leaving the job site.
          </p>
        </div>
      </section>

      <HomeTrustStrip stats={stats} />

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Our mission</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Growth. Support. Development.</h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            Professional development should fit around your work — not the other way around.
          </p>
          <div className="mt-10">
            <AboutMissionPillars />
          </div>
          <div className={`mt-12 max-w-3xl space-y-4 ${LANDING_LEAD_CLASS}`}>
            <p>
              The cleaning and restoration industry is demanding. Technicians work long hours, often
              interstate, responding to water damage, fire, and mould events. For IICRC members,
              continuing education through CECs has historically meant flights, hotels, and days
              away from active jobs. CARSI changes that.
            </p>
            <p>
              Our platform is available 24/7 from any device — whether you&apos;re between jobs in
              regional Queensland or studying at midnight in Perth.
              {n > 0 ? (
                <>
                  {' '}
                  With {formatCourseCountForCopy(n)} course{n === 1 ? '' : 's'} across{' '}
                  {d > 0 ? `${d} disciplines` : 'seven core disciplines'}, plus full-access
                  subscription options, we keep continuing education moving in Australia.
                </>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Credentials</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Built on real industry authority</h2>
          <div className="mt-12 grid gap-10 border-t border-slate-200/70 pt-10 md:grid-cols-3">
            {credentials.map((item) => (
              <div
                key={item.title}
                className="md:border-l md:border-slate-200/70 md:pl-8 md:first:border-l-0 md:first:pl-0"
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="mx-auto max-w-2xl text-center">
            <p className={LANDING_EYEBROW_CLASS}>How it works</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>From enrolment to credential</h2>
          </div>
          <div className="mt-10 rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 shadow-sm md:p-10">
            <StudentJourneyMap />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>The CARSI difference</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Why technicians choose us</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <div className="border-t border-slate-200/70 pt-8">
              <BadgeCheck className="mb-4 h-5 w-5 text-[#146fc2]" aria-hidden />
              <p className="text-sm leading-relaxed text-slate-600">
                Traditional restoration training in Australia often requires travel. A two-day
                face-to-face course in a capital city can cost over $2,000 in flights and
                accommodation alone — on top of course fees and lost billing days. CARSI eliminates
                those costs. Courses are self-paced, certificates are instant, and CEC progress is
                tracked in your dashboard.
              </p>
            </div>
            <div className="border-t border-slate-200/70 pt-8">
              <Shield className="mb-4 h-5 w-5 text-[#146fc2]" aria-hidden />
              <p className="text-sm leading-relaxed text-slate-600">
                CARSI is a core pillar of the National Restoration Professionals Group (NRPG)
                onboarding pathway. Our training is recognised by major Australian insurers as
                evidence of professional competency.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Discipline coverage</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>IICRC CEC Accredited course catalogue</h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            {d > 0
              ? `Published courses across ${d} restoration discipline${d === 1 ? '' : 's'} — each awarding a CARSI Southern Hemisphere Restoration Designation.`
              : 'IICRC CEC Accredited courses across all seven core restoration disciplines.'}
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {disciplineRows.map((row) => (
              <div
                key={row.code}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-[#fafbfc] px-4 py-3"
              >
                <span className="min-w-[3rem] font-mono text-xs font-bold text-[#146fc2]">
                  {row.code}
                </span>
                <span className="text-sm text-slate-600">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Leadership</p>
          <h2 id="board-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Meet the Board
          </h2>
          <p className={`mt-4 max-w-xl ${LANDING_LEAD_CLASS}`}>
            The people leading CARSI’s direction, course standards and industry partnerships.
          </p>
          <div className="mt-10">
            <MeetTheBoard members={getBoardMembers()} />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-white py-10">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className="max-w-3xl text-xs leading-relaxed text-slate-500">
            The IICRC does not endorse any educational provider, product, offering, or service. The
            Institute expressly disclaims responsibility, endorsement or warranty for third-party
            publications, products, certifications, or instruction. CEC accreditation does not award
            IICRC Certification; it only qualifies continuing education hours where applicable. CARSI
            courses are IICRC CEC Accredited courses where stated.
          </p>
        </div>
      </section>

      <HomeFinalCtaSection />
    </>
  );
}
