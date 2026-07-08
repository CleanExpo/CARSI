import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Globe2,
  Shield,
  Sparkles,
} from 'lucide-react';

import { AboutMissionPillars } from '@/components/marketing/about/AboutMissionPillars';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import { GlassStatCard } from '@/components/industries/GlassStatCard';
import { StudentJourneyMap } from '@/components/lms/diagrams/StudentJourneyMap';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { disciplineRowsFromCodes } from '@/lib/iicrc-discipline-display';
import {
  marketingBody,
  marketingBodySm,
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingEyebrowPill,
  marketingHeading,
  marketingIconWrap,
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';
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
    icon: Shield,
    title: 'CFO & CBFRS Credentialed',
    desc: 'Certified Flooring Organisation and Certified Building Flood Recovery Specialist — one of very few holders of both credentials in Australia.',
  },
  {
    icon: Award,
    title: '50+ Years Combined Experience',
    desc: 'Founders and instructors bring decades of hands-on experience across cleaning, water damage, and building restoration.',
  },
  {
    icon: Globe2,
    title: 'Raise the Bar',
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
      : disciplineRowsFromCodes(['WRT', 'RRT', 'ASD', 'AMRT', 'FSRT', 'OCT', 'CCT']);

  const stats = [
    {
      value: n > 0 ? formatCourseCountForCopy(n) : '—',
      label: 'CEC courses',
      accent: '#2490ed',
    },
    {
      value: d > 0 ? formatCourseCountForCopy(d) : '7',
      label: 'IICRC disciplines',
      accent: '#26c4a0',
    },
    { value: '12+', label: 'Industries served', accent: '#c2740a' },
  ];

  return (
    <MarketingPageShell id="main-content">
      <header className="pb-10 sm:pb-14">
        <p className={`mb-4 inline-flex items-center gap-2 ${marketingEyebrowPill}`}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          About CARSI
        </p>
        <h1 className={`max-w-4xl ${marketingHeading}`}>
          Raising the bar for restoration professionals.
        </h1>
        <p className={`mt-5 max-w-3xl ${marketingBody}`}>
          CARSI — the Centre for Australian Restoration and Standards Information — is
          Australia&apos;s leading online training platform for cleaning and restoration
          professionals. We offer beginner, intermediate, and advanced{' '}
          <AcronymTooltip term="IICRC" /> <AcronymTooltip term="CEC" /> accredited courses for
          people starting out, updating their knowledge, or maintaining continuing education without
          leaving the job site.
        </p>
      </header>

      <section className="mb-14 sm:mb-16">
        <MarketingSectionHeader
          eyebrow="Our mission"
          title="Growth. Support. Development."
          body="Professional development should fit around your work — not the other way around."
          pill={false}
        />
        <AboutMissionPillars />
        <div className={`mt-8 space-y-4 ${marketingBodySm}`}>
          <p>
            The cleaning and restoration industry is demanding. Technicians work long hours, often
            interstate, responding to water damage, fire, and mould events. For IICRC members,
            continuing education through CECs has historically meant flights, hotels, and days away
            from active jobs. CARSI changes that.
          </p>
          <p>
            Our platform is available 24/7 from any device — whether you&apos;re between jobs in
            regional Queensland or studying at midnight in Perth.
            {n > 0 ? (
              <>
                {' '}
                With {formatCourseCountForCopy(n)} accredited course{n === 1 ? '' : 's'} across{' '}
                {d > 0 ? `${d} disciplines` : 'seven core disciplines'}, plus full-access
                subscription options, we keep continuing education moving in Australia.
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="mb-14 sm:mb-16" aria-label="Platform at a glance">
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <GlassStatCard key={stat.label} value={stat.value} label={stat.label} accentColor={stat.accent} />
          ))}
        </div>
      </section>

      <section className="mb-14 sm:mb-16" aria-label="Our credentials">
        <MarketingSectionHeader
          eyebrow="Credentials"
          title="Built on real industry authority"
          body="Practitioner-led training backed by credentials that matter in the Australian market."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {credentials.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`p-5 ${marketingPanel}`}>
                <div className={marketingIconWrap}>
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className={`mt-4 text-base font-semibold ${marketingTextStrong}`}>{item.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${marketingTextMuted}`}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-14 sm:mb-16" aria-label="Learning journey">
        <div className={`p-5 sm:p-6 ${marketingPanel}`}>
          <MarketingSectionHeader
            eyebrow="How it works"
            title="From enrolment to credential"
            body="A structured path from first lesson to shareable digital certificate."
            className="mb-6"
          />
          <StudentJourneyMap />
        </div>
      </section>

      <section className="mb-14 sm:mb-16" aria-label="Why CARSI">
        <MarketingSectionHeader
          eyebrow="The CARSI difference"
          title="Why technicians choose us"
          body="Online, self-paced, and designed for people who cannot pause the job site for classroom training."
        />
        <div className={`grid gap-4 lg:grid-cols-2 ${marketingBodySm}`}>
          <div className={`p-5 ${marketingPanel}`}>
            <BadgeCheck className="mb-3 h-5 w-5 text-[#146fc2] dark:text-[#8fd0ff]" aria-hidden />
            <p>
              Traditional restoration training in Australia often requires travel. A two-day
              face-to-face course in a capital city can cost over $2,000 in flights and accommodation
              alone — on top of course fees and lost billing days. CARSI eliminates those costs.
              Courses are self-paced, certificates are instant, and CEC progress is tracked in your
              dashboard.
            </p>
          </div>
          <div className={`p-5 ${marketingPanel}`}>
            <Shield className="mb-3 h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <p>
              CARSI is a core pillar of the National Restoration Professionals Group (NRPG)
              onboarding pathway. Our training is recognised by major Australian insurers as
              evidence of professional competency.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-14 sm:mb-16" aria-label="IICRC disciplines">
        <MarketingSectionHeader
          eyebrow="Discipline coverage"
          title="IICRC-aligned course catalogue"
          body={
            d > 0
              ? `Published courses tagged across ${d} IICRC discipline${d === 1 ? '' : 's'} — each counting toward continuing education credits.`
              : 'CEC Accredited courses across all seven core IICRC disciplines.'
          }
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {disciplineRows.map((row) => (
            <div
              key={row.code}
              className="flex items-center gap-3 rounded-xl border border-[#2490ed]/20 bg-[#eef7ff]/80 px-3 py-2.5 dark:border-[#2490ed]/25 dark:bg-[#2490ed]/10"
            >
              <span className="min-w-[3rem] font-mono text-xs font-bold text-[#146fc2] dark:text-[#8fd0ff]">
                {row.code}
              </span>
              <span className={`text-sm ${marketingTextMuted}`}>{row.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mb-10 rounded-2xl border border-[#2490ed]/20 bg-gradient-to-br from-[#eef7ff] via-white to-[#f8fbff] p-6 sm:p-8 dark:border-[#2490ed]/25 dark:from-[#2490ed]/10 dark:via-[#0a0f18] dark:to-[#060a14]"
        aria-label="Get started"
      >
        <h2 className={`text-xl font-bold sm:text-2xl ${marketingTextStrong}`}>
          Ready to advance your career?
        </h2>
        <p className={`mt-2 max-w-xl ${marketingBodySm}`}>
          Browse the full course catalogue or explore subscription options for unlimited access.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/courses" className={marketingBtnPrimary}>
            Browse courses
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/pricing" className={marketingBtnSecondary}>
            View pricing
          </Link>
        </div>
      </section>

      <section className={`p-5 ${marketingPanel}`} aria-label="IICRC disclaimer">
        <p className={`text-xs leading-relaxed italic ${marketingTextMuted}`}>
          The IICRC does not endorse any educational provider, product, offering, or service. The
          Institute expressly disclaims responsibility, endorsement or warranty for third-party
          publications, products, certifications, or instruction. CEC accreditation does not award
          IICRC Certification; it only qualifies continuing education hours where applicable.
        </p>
        <p className={`mt-3 text-xs font-medium ${marketingTextStrong}`}>
          CARSI courses are IICRC CEC Accredited courses where stated.
        </p>
      </section>
    </MarketingPageShell>
  );
}
